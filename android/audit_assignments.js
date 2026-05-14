const fs = require('fs');
const path = require('path');

const androidDir = 'C:\\Users\\Usuario\\.gemini\\antigravity\\scratch\\cobros-main\\android';

function parseSqlLine(line) {
    if (!line.includes('(') || !line.includes(')')) return null;
    const content = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
    // Simple split by comma, ignoring commas inside strings (approximate)
    const parts = [];
    let current = '';
    let inString = false;
    let inJson = 0;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === "'" && content[i-1] !== '\\') {
            inString = !inString;
            current += char;
        } else if (char === '[' || char === '{') {
            inJson++;
            current += char;
        } else if (char === ']' || char === '}') {
            inJson--;
            current += char;
        } else if (char === ',' && !inString && inJson === 0) {
            parts.push(current.trim().replace(/^'|'$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current.trim().replace(/^'|'$/g, ''));
    return parts;
}

async function runAudit() {
    console.log("--- INICIANDO AUDITORÍA GLOBAL POR GERENTE ---");
    
    // 1. Cargar Usuarios y Mapear Cobrador -> Gerente
    const profilesPath = path.join(androidDir, 'bak_profiles.json');
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    const userMap = {};
    const collectorToManager = {};
    
    profiles.forEach(u => {
        userMap[u.id] = u.name;
        if (u.role === 'Cobrador' || u.role === 'COLLECTOR') {
            collectorToManager[u.id] = u.managed_by || u.managedBy || 'SIN GERENTE';
        }
    });

    // 2. Cargar Clientes
    const clientsFile = path.join(androidDir, 'TOTAL_CLIENTES.sql');
    const clientsLines = fs.readFileSync(clientsFile, 'utf8').split('\n');
    const clients = [];
    
    clientsLines.forEach(line => {
        const parts = parseSqlLine(line);
        if (parts && parts.length >= 13) {
            clients.push({
                id: parts[0],
                name: parts[1],
                addedBy: parts[7],
                collectorId: parts[22],
                branchId: parts[6]
            });
        }
    });

    // 3. Cargar Préstamos Activos
    const loansFile = path.join(androidDir, 'TOTAL_PRESTAMOS.sql');
    const loansLines = fs.readFileSync(loansFile, 'utf8').split('\n');
    const activeLoans = [];
    
    loansLines.forEach(line => {
        const parts = parseSqlLine(line);
        if (parts && parts.length >= 6) {
            const status = parts[5];
            if (status === 'Activo' || status === 'Mora') {
                activeLoans.push({
                    id: parts[0],
                    clientId: parts[1],
                    collectorId: parts[9],
                    amount: parts[4]
                });
            }
        }
    });

    // 4. Analizar Discrepancias por Gerente
    const allManagers = profiles.filter(p => p.role === 'Gerente' || p.role === 'MANAGER' || p.role === 'Administrador');
    const managerStats = {};
    
    allManagers.forEach(m => {
        managerStats[m.name] = {
            id: m.id,
            totalDiscrepancias: 0,
            detalles: []
        };
    });

    clients.forEach(client => {
        const loans = activeLoans.filter(l => l.clientId === client.id);
        
        loans.forEach(loan => {
            const loanCollector = loan.collectorId;
            const managerId = collectorToManager[loanCollector];
            let managerName = 'DESCONOCIDO';
            
            if (managerId) {
                const manager = allManagers.find(m => m.id === managerId);
                if (manager) managerName = manager.name;
                else managerName = managerId;
            }

            if (!managerStats[managerName]) {
                managerStats[managerName] = { totalDiscrepancias: 0, detalles: [] };
            }

            if (loanCollector !== client.collectorId && loanCollector !== client.addedBy) {
                managerStats[managerName].totalDiscrepancias++;
                managerStats[managerName].detalles.push({
                    cliente: client.name,
                    cobradorPrestamo: userMap[loanCollector] || loanCollector,
                    fichaDuenio: userMap[client.collectorId || client.addedBy] || "Desconocido"
                });
            }
        });
    });

    console.log("\n--- INFORME GLOBAL DE TODOS LOS GERENTES ---");
    Object.keys(managerStats).sort().forEach(m => {
        console.log(`- ${m}: ${managerStats[m].totalDiscrepancias} discrepancias.`);
    });
}

runAudit();
