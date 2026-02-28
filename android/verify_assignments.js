const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '.';

try {
    const profiles = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_profiles.json'), 'utf8'));
    const clients = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_clients.json'), 'utf8'));
    const loans = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'bak_loans.json'), 'utf8'));

    const diegoProfiles = profiles.filter(p => p.name.toLowerCase().includes('diego'));

    console.log(`--- REPORTE EXHAUSTIVO: DIEGOS (v7) ---`);
    diegoProfiles.forEach(p => console.log(`Profile: ${p.name} | ID: ${p.id} | Role: ${p.role} | Active: ${!p.deleted_at}`));
    console.log('---------------------------------------\n');

    diegoProfiles.forEach(p => {
        const addedClients = clients.filter(c => c.added_by === p.id);
        const collectingLoans = loans.filter(l => l.collector_id === p.id && (l.status === 'Activo' || l.status === 'Vencido'));

        console.log(`\n>>> ANALIZANDO: ${p.name} (${p.id})`);
        console.log(`Clientes agregados: ${addedClients.length}`);
        console.log(`Cobra actualmente: ${collectingLoans.length} préstamos`);

        if (addedClients.length > 0) {
            console.log(`Muestra de clientes agregados: ${addedClients.slice(0, 5).map(c => c.name).join(', ')}`);
        }
    });

} catch (err) {
    console.error('Error:', err.message);
}
