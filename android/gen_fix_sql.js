const fs = require('fs');
const path = require('path');

const BACKUP_DIR = 'c:/Users/DANIEL/Desktop/cobros/android';

try {
    const profiles = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_profiles.json'), 'utf8'));
    const clients = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_clients.json'), 'utf8'));
    const loans = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_loans.json'), 'utf8'));

    const ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
    const activeProfiles = profiles.filter(p => !p.deleted_at);
    const collectorMap = new Map(activeProfiles.map(p => [p.id, p]));

    let sql = `-- MIGRACIÓN DE CORRECCIÓN DE ASIGNACIONES\nBEGIN;\n\n`;

    // 1. Corregir collector_id en loans (cuando está en Admin pero el cliente fue agregado por un cobrador activo)
    const activeLoans = loans.filter(l => l.collector_id === ADMIN_ID && (l.status === 'Activo' || l.status === 'Vencido'));
    let countLoans = 0;

    activeLoans.forEach(loan => {
        const client = clients.find(c => c.id === loan.client_id);
        if (client && client.added_by !== ADMIN_ID) {
            const addedByProfile = collectorMap.get(client.added_by);
            if (addedByProfile && (addedByProfile.role.toLowerCase() === 'cobrador' || addedByProfile.role.toLowerCase() === 'collector')) {
                sql += `UPDATE public.loans SET collector_id = '${client.added_by}' WHERE id = '${loan.id}'; -- Cliente: ${client.name}\n`;
                countLoans++;
            }
        }
    });

    sql += `\n-- 2. Normalizar branch_id en clientes (basado en la sucursal del cobrador que tiene el préstamo activo)\n`;

    // Necesitamos re-analizar todos los préstamos activos (incluyendo los recién corregidos en el mapa mental)
    const allActiveLoans = loans.filter(l => (l.status === 'Activo' || l.status === 'Vencido'));
    let countBranches = 0;

    allActiveLoans.forEach(loan => {
        const client = clients.find(c => c.id === loan.client_id);
        if (!client) return;

        // Si el préstamo estaba en Admin y lo corregimos arriba, usamos el nuevo collector_id conceptualmente
        let effectiveCollectorId = loan.collector_id;
        if (effectiveCollectorId === ADMIN_ID && client.added_by !== ADMIN_ID) {
            const addedByProfile = collectorMap.get(client.added_by);
            if (addedByProfile && (addedByProfile.role.toLowerCase() === 'cobrador' || addedByProfile.role.toLowerCase() === 'collector')) {
                effectiveCollectorId = client.added_by;
            }
        }

        const collector = collectorMap.get(effectiveCollectorId);
        if (collector) {
            const targetBranch = (collector.role.toLowerCase() === 'cobrador' || collector.role.toLowerCase() === 'collector')
                ? collector.managed_by
                : collector.id;

            if (targetBranch && client.branch_id !== targetBranch) {
                sql += `UPDATE public.clients SET branch_id = '${targetBranch}' WHERE id = '${client.id}'; -- Cobrador: ${collector.name}\n`;
                countBranches++;
            }
        }
    });

    sql += `\nCOMMIT;`;

    fs.writeFileSync('c:/Users/DANIEL/Desktop/cobros/android/FIX_assignments.sql', sql);
    console.log(`✅ Generada migración con ${countLoans} correcciones de préstamos y ${countBranches} de sucursales.`);

} catch (err) {
    console.error('Error:', err.message);
}
