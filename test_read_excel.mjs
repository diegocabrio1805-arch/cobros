import xlsx from 'xlsx-js-style';
import fs from 'fs';

const path = 'C:\\Users\\HP\\Desktop\\prueba 77777.xlsx';
const buf = fs.readFileSync(path);
const workbook = xlsx.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false });

const out = {
    sheetName,
    totalRows: data.length,
    first10Rows: data.slice(0, 10),
};

fs.writeFileSync('./prueba77777_output.json', JSON.stringify(out, null, 2), 'utf8');
console.log('Written to prueba77777_output.json - total rows:', data.length);
console.log('Row 0 (headers):', JSON.stringify(data[0]));
console.log('Row 1:', JSON.stringify(data[1]));
console.log('Row 2:', JSON.stringify(data[2]));
