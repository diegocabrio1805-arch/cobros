const fs = require('fs');
const path = require('path');

const BACKUP_DIR = 'c:/Users/DANIEL/Desktop/cobros/android';

try {
    const profiles = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_profiles.json'), 'utf8'));
    const clients = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_clients.json'), 'utf8'));
    const loans = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_loans.json'), 'utf8'));

    const collectors = profiles.filter(p => p.role.toLowerCase() === 'cobrador' && !p.deleted_at);
    const collectorMap = new Map(collectors.map(c => [c.id, c]));

    console.log(`--- REPORTE DE VERIFICACIÓN GLOBAL ---`);
    console.log(`Cobradores Activos: ${collectors.length}`);
    console.log(`Total Clientes: ${clients.length}`);
    console.log(`Total Préstamos: ${loans.length}`);
    console.log('-------------------------------------\n');

    const activeLoans = loans.filter(l => l.status === 'ACTIVE' || l.status === 'DEFAULT');
    const clientAssignments = new Map();

    // 1. Mapear por Préstamo Activo (Fuente de verdad para la Ruta de Cobro)
    activeLoans.forEach(loan => {
        clientAssignments.set(loan.client_id, {
            collectorId: loan.collector_id,
            loanId: loan.id,
            status: loan.status
        });
    });

    const report = {
        correct: 0,
        missingCollector: [],
        invalidCollector: [],
        orphanedClients: []
    };

    clients.forEach(client => {
        if (client.deleted_at) return;

        const assignment = clientAssignments.get(client.id);

        if (!assignment) {
            // Cliente sin préstamo activo
            report.orphanedClients.push({
                id: client.id,
                name: client.name,
                addedBy: client.added_by
            });
            return;
        }

        const collector = collectorMap.get(assignment.collectorId);
        if (!assignment.collectorId) {
            report.missingCollector.push({
                clientId: client.id,
                clientName: client.name,
                loanId: assignment.loanId
            });
        } else if (!collector) {
            report.invalidCollector.push({
                clientId: client.id,
                clientName: client.name,
                collectorId: assignment.collectorId,
                loanId: assignment.loanId
            });
        } else {
            report.correct++;
        }
    });

    console.log(`Resumen:`);
    console.log(`- Asignaciones Correctas: ${report.correct}`);
    console.log(`- Sin Cobrador asignado en Préstamo: ${report.missingCollector.length}`);
    console.log(`- Con Cobrador inválido o eliminado: ${report.invalidCollector.length}`);
    console.log(`- Clientes sin préstamo activo (Históricos/Huérfanos): ${report.orphanedClients.length}`);

    if (report.missingCollector.length > 0) {
        console.log('\n--- PRÉSTAMOS SIN COBRADOR ---');
        report.missingCollector.forEach(c => console.log(`Cliente: ${c.clientName} | LoanID: ${c.loanId}`));
    }

    if (report.invalidCollector.length > 0) {
        console.log('\n--- PRÉSTAMOS CON COBRADOR INVÁLIDO ---');
        report.invalidCollector.forEach(c => console.log(`Cliente: ${c.clientName} | CobradorID: ${c.collectorId}`));
    }

    // Análisis de "Added By" vs "Collector ID"
    console.log('\n--- ANÁLISIS DE CONSISTENCIA (ZONAS) ---');
    const zoneDiscrepancies = [];
    clients.forEach(client => {
        const assignment = clientAssignments.get(client.id);
        if (assignment && assignment.collectorId && client.added_by && assignment.collectorId !== client.added_by) {
            const addedBy = profiles.find(p => p.id === client.added_by)?.name || 'Desconocido';
            const currentCollector = collectorMap.get(assignment.collectorId)?.name || 'Desconocido';
            zoneDiscrepancies.push({
                client: client.name,
                addedBy,
                currentCollector
            });
        }
    });
    console.log(`Discrepancias (Agregado por X, Cobrado por Y): ${zoneDiscrepancies.length}`);
    if (zoneDiscrepancies.length < 50) {
        zoneDiscrepancies.forEach(d => console.log(`Cliente: ${d.client} | Agregado por: ${d.addedBy} | Cobra: ${d.currentCollector}`));
    } else {
        console.log('Demasiadas discrepancias para mostrar (probablemente re-asignaciones masivas).');
    }

} catch (err) {
    console.error('Error durante la verificación:', err.message);
}
