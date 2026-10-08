import XLSX from 'xlsx-js-style';
import fs from 'fs';

// Mock helpers and excelHelper functions just enough to see what it does
import { processExcelImport } from '../utils/excelHelper.js';

async function test() {
    const buf = fs.readFileSync('C:/Users/Usuario/Desktop/PLANILLA PARA APP 08-10-2026.xlsx');
    const file = new File([buf], 'PLANILLA.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Polyfill for FileReader since it's running in Node
    global.FileReader = class {
        onload = null;
        readAsArrayBuffer(f) {
            setTimeout(() => {
                this.onload({ target: { result: buf.buffer } });
            }, 100);
        }
    };
    
    try {
        const result = await processExcelImport(file, 'gps', 'branch', 'vend');
        const clients = result.clients.filter(c => c.name.includes('AQUINO') || c.name.includes('ALEGRE'));
        const loans = result.loans.filter(l => clients.some(c => c.id === l.clientId));
        console.log("CLIENTS:", JSON.stringify(clients, null, 2));
        console.log("LOANS:", JSON.stringify(loans, null, 2));
        console.log("ERRORS:", JSON.stringify(result.errors.filter(e => e.clientName?.includes('AQUINO') || e.clientName?.includes('ALEGRE')), null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
