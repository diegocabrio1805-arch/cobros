const fs = require('fs');
const path = require('path');

const bakDir = path.join(__dirname, 'android');
const profiles = JSON.parse(fs.readFileSync(path.join(bakDir, 'bak_profiles.json'), 'utf-8'));
const clients = JSON.parse(fs.readFileSync(path.join(bakDir, 'bak_clients.json'), 'utf-8'));
const loans = JSON.parse(fs.readFileSync(path.join(bakDir, 'bak_loans.json'), 'utf-8'));
const payments = JSON.parse(fs.readFileSync(path.join(bakDir, 'bak_payments.json'), 'utf-8'));

const Role = { ADMIN: 'Administrador', COLLECTOR: 'Cobrador', MANAGER: 'Gerente' };
const LoanStatus = { ACTIVE: 'Activo', PAID: 'Pagado', DEFAULT: 'Mora' };

function getCollectorBalances(user) {
    // Mimic the NEW filteredState logic
    const clientOwnerMap = new Map();
    const clientLatestLoanDate = new Map();
    const clientHasActiveLoan = new Map();

    loans.forEach(l => {
        if (l.deletedAt) return;
        const cId = l.clientId;
        const collId = l.collectorId;
        const status = l.status;
        const createdAt = l.createdAt || '';
        const isActive = status === LoanStatus.ACTIVE || status === LoanStatus.DEFAULT;

        if (isActive) {
            clientOwnerMap.set(cId, collId);
            clientHasActiveLoan.set(cId, true);
        } else if (!clientHasActiveLoan.get(cId)) {
            const latestDate = clientLatestLoanDate.get(cId) || '';
            if (createdAt >= latestDate) {
                clientLatestLoanDate.set(cId, createdAt);
                clientOwnerMap.set(cId, collId);
            }
        }
    });

    const visibleClients = clients.filter(c => {
        if (c.deletedAt) return false;
        const isOwner = clientOwnerMap.get(c.id) === user.id;
        const isCreator = c.addedBy === user.id;
        return isOwner || isCreator;
    });

    const visibleClientIds = new Set(visibleClients.map(c => c.id));
    const visibleLoans = loans.filter(l => !l.deletedAt && l.collectorId === user.id);
    const visibleLoanIds = new Set(visibleLoans.map(l => l.id));
    const visiblePayments = payments.filter(p => !p.deletedAt && (visibleLoanIds.has(p.loanId) || p.collectorId === user.id));

    const results = {};
    visibleClients.forEach(c => {
        const clientLoans = visibleLoans.filter(l => l.clientId === c.id && l.status !== LoanStatus.PAID);
        const totalMonto = clientLoans.reduce((sum, l) => sum + (l.totalAmount || 0), 0);
        const totalCobrado = visiblePayments.filter(p => p.clientId === c.id).reduce((sum, p) => sum + (p.amount || 0), 0);
        
        results[c.id] = {
            name: c.name,
            monto: totalMonto,
            cobrado: totalCobrado,
            saldo: totalMonto - totalCobrado
        };
    });
    return results;
}

function getAdminBalances() {
    const results = {};
    clients.filter(c => !c.deletedAt).forEach(c => {
        const clientLoans = loans.filter(l => !l.deletedAt && l.clientId === c.id && l.status !== LoanStatus.PAID);
        const totalMonto = clientLoans.reduce((sum, l) => sum + (l.totalAmount || 0), 0);
        const totalCobrado = payments.filter(p => !p.deletedAt && p.clientId === c.id).reduce((sum, p) => sum + (p.amount || 0), 0);
        
        results[c.id] = {
            name: c.name,
            monto: totalMonto,
            cobrado: totalCobrado,
            saldo: totalMonto - totalCobrado
        };
    });
    return results;
}

const adminBalances = getAdminBalances();
const juve = profiles.find(p => p.name === 'JUVE VILLALBA');
const juveBalances = getCollectorBalances(juve);

console.log(`Auditoría para ${juve.name}:`);
Object.keys(juveBalances).forEach(cId => {
    const j = juveBalances[cId];
    const a = adminBalances[cId];
    if (j.monto !== a.monto || j.cobrado !== a.cobrado) {
        console.log(`\nDiscrepancia en cliente: ${j.name} (${cId})`);
        console.log(`  JUVE  -> Monto: ${j.monto}, Cobrado: ${j.cobrado}, Saldo: ${j.saldo}`);
        console.log(`  ADMIN -> Monto: ${a.monto}, Cobrado: ${a.cobrado}, Saldo: ${a.saldo}`);
    }
});
