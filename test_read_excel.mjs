import xlsx from 'xlsx-js-style';

import fs from 'fs';

const path = 'C:\\Users\\HP\\Desktop\\CRISTHIAN 23-03-2026- programa .xlsx';
const buf = fs.readFileSync(path);
const workbook = xlsx.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log("=================== HEADERS ===================");
console.log(data[0]);

console.log("=================== ROW 1 ===================");
console.log(data[1]);

console.log("=================== ROW 2 ===================");
console.log(data[2]);

console.log("=================== SEARCH OTHERS ===================");
console.log("=================== SEARCH CHAPARRO ===================");
console.log("CHAPARRO:", data.filter(r => r?.some && r.some(c => String(c).toUpperCase().includes("CHAPARRO"))));
console.log("GENES MARCELINA:", data.filter(r => r?.some && r.some(c => String(c).toUpperCase().includes("GENES PINTOS"))));
