import * as XLSX from 'xlsx-js-style';
import * as fs from 'fs';
import { processExcelImport } from '../utils/excelHelper';

async function test() {
    const buf = fs.readFileSync('C:/Users/Usuario/Desktop/PLANILLA PARA APP 08-10-2026.xlsx');
    const file = new File([buf], 'PLANILLA.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Polyfill for FileReader since it's running in Node
    (global as any).FileReader = class {
        onload: any = null;
        readAsArrayBuffer(f: any) {
            setTimeout(() => {
                this.onload({ target: { result: buf.buffer } });
            }, 100);
        }
    };
    
    try {
        const result = await processExcelImport(file, 'gps', 'branch', 'vend', 'PY', [], []);
        const clients = result.clients.filter(c => c.name.includes('AQUINO') || c.name.includes('ALEGRE') || c.name.includes('FLORES') || c.name.includes('CUENCA') || c.name.includes('AYALA'));
        const loans = result.loans.filter(l => clients.some(c => c.id === l.clientId));
        console.log("CLIENTS:", JSON.stringify(clients, null, 2));
        console.log("LOANS:", JSON.stringify(loans, null, 2));
        console.log("ERRORS:", JSON.stringify(result.errors.filter(e => e.clientName?.includes('AQUINO') || e.clientName?.includes('ALEGRE') || e.clientName?.includes('FLORES') || e.clientName?.includes('CUENCA') || e.clientName?.includes('AYALA')), null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
