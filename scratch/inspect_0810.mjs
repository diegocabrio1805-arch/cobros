import XLSX from 'xlsx-js-style';
import fs from 'fs';

const filePath = 'C:/Users/Usuario/Desktop/PLANILLA PARA APP 08-10-2026.xlsx';
const buf = fs.readFileSync(filePath);
const workbook = XLSX.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const targets = ["AQUINO DE MOREL", "FLORES, TERESA", "ALEGRE GARCIA", "AYALA SAUCEDO", "CUENCA MARTINEZ"];

console.log("Headers:");
console.log(rows[0]);

rows.forEach((row, i) => {
    const name = String(row[1] || '').toUpperCase();
    if (targets.some(t => name.includes(t))) {
        console.log(`Row ${i + 1}:`);
        console.log(row);
    }
});
