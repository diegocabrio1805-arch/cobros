import fs from 'fs';
import xlsx from 'xlsx-js-style';

const normalizeHeader = (s) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").trim();

const parseAmount = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    if (str === '' || str === '-') return 0;
    const clean = str.replace(/[^\d.,-]/g, '');
    const lastDot = clean.lastIndexOf('.');
    const lastComma = clean.lastIndexOf(',');
    if (lastComma === -1 && lastDot !== -1) {
        const dots = (clean.match(/\./g) || []).length;
        const afterLastDot = clean.substring(lastDot + 1);
        if (dots > 1 || afterLastDot.length === 3) return parseFloat(clean.replace(/\./g, '')) || 0;
    }
    const standard = clean.replace(/\./g, '').replace(',', '.');
    return parseFloat(standard) || 0;
};

const path = 'C:\\Users\\HP\\Desktop\\CRISTHIAN 23-03-2026- programa .xlsx';
const buf = fs.readFileSync(path);
const workbook = xlsx.read(buf, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

const headerRow = data[0];
const colMap = {};
headerRow.forEach((h, i) => {
    if (h) colMap[normalizeHeader(h)] = i;
});

const findCol = (synonyms) => {
    const normSyns = synonyms.map(s => normalizeHeader(s));
    for (const sNorm of normSyns) { if (colMap[sNorm] !== undefined) return colMap[sNorm]; }
    for (const sNorm of normSyns) {
        if (["MONTO", "CUOTA", "SALDO", "FECHA", "PAGADAS", "PAGARE", "NOMBRE"].includes(sNorm)) continue;
        const partial = Object.keys(colMap).find(k => k.includes(sNorm) || sNorm.includes(k));
        if (partial !== undefined) return colMap[partial];
    }
    return undefined;
};

const idxs = {
    name: findCol(["NOMBRE COMPLETO", "NOMBRE", "CLIENTE", "RAZON SOCIAL", "TITULAR", "NAME", "NOMBRERAZONSOCIAL", "NOMBRE / RAZON SOCIAL"]),
    docId: findCol(["DOCUMENTO", "CEDULA", "DNI", "DOCID", "OPN", "OP. Nº"]),
    principal: findCol(["MONTO PRESTADO", "CAPITAL", "MONTO", "PRINCIPAL"]),
    totalAmt: findCol(["TOTAL A PAGAR", "TOTAL RETORNO", "MONTO TOTAL", "TOTALAMT", "PAGARE", "IMPORT. PAGARE", "IMPORTPAGARE"]),
    instValue: findCol(["VALOR CUOTA", "VALCUOTA", "VAL. CUOTA", "INSTVALUE", "CUOTA"]),
    totalInst: findCol(["CUOTAS TOTALES", "PLAZO", "TOTALINST", "CTAS. TOT", "CTASTOT"]),
    paidInst: findCol(["CUOTAS PAGADAS", "PAGADAS", "PAIDINST", "CTA. PAG", "CTAPAG", "COBRADO"]), // Wait, Cobrado wasn't mapped in our app but we added it?
    balance: findCol(["SALDO PENDIENTE", "SALDO ACTUAL", "BALANCE", "SALDO"]),
};

console.log("Column Mapping:", colMap);
console.log("Found Indexes:", idxs);

const chaparroRows = data.filter(r => r.some && r.some(c => String(c).toUpperCase().includes("CHAPARRO")));
const row = chaparroRows[0];

console.log("Raw Row data:", row);
console.log("DocID:", row[idxs.docId]);

let totalAmount = parseAmount(row[idxs.totalAmt ?? -1]);
let instValue = parseAmount(row[idxs.instValue ?? -1]);
let totalInst = parseAmount(row[idxs.totalInst ?? -1]);
let paidInst = parseAmount(row[idxs.paidInst ?? -1]);
let pendInst = Math.max(0, totalInst - paidInst);
let balance = parseAmount(row[idxs.balance ?? -1]);

if (totalInst === 0) {
    const idxsPendInst = findCol(["CTASPEND", "CTAS.PEND", "PENDIENTE"]);
    pendInst = parseAmount(row[idxsPendInst ?? -1]);
    totalInst = paidInst + pendInst;
}

console.log({ totalAmount, instValue, totalInst, paidInst, pendInst, balance });
