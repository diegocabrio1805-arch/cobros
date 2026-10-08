import * as XLSX from 'xlsx-js-style';
import * as fs from 'fs';
import { parseAmount } from '../utils/helpers';
import { parseDaysDelayed } from '../utils/excelHelper';

const buf = fs.readFileSync('C:/Users/Usuario/Desktop/PLANILLA PARA APP 08-10-2026.xlsx');
const wb = XLSX.read(buf, {type: 'buffer'});
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, {header: 1});

const getColMap = (headerRowIndex) => {
    const map = {};
    (rows[headerRowIndex] || []).forEach((val, idx) => {
        const key = String(val || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").trim();
        if (key) map[key] = idx;
    });
    return map;
};

const colMap = getColMap(0);

const findCol = (synonyms) => {
    for (const s of synonyms) {
        const sNorm = s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").trim();
        if (colMap[sNorm] !== undefined) return colMap[sNorm];
    }
    return undefined;
};

const idxs = {
    docId: findCol(["DOCUMENTO", "CEDULA", "DNI", "DOCID", "OPN", "OP. Nº", "OP. NRO", "OPNRO", "ID", "DOC. I.", "DOCI"]),
    name: findCol(["NOMBRECOMPLETO", "NOMBRERAZONSOCIAL", "CLIENTE", "RAZONSOCIAL", "NOMBRE", "NOMBRE / RAZON SOCIAL"]),
    principal: findCol(["CAPITAL", "MONTO", "VALOREMPRESTADO", "LIQDESEMB", "PRINCIPAL", "MONTO PRESTADO", "LIQ. DESEMB.", "CREDITO"]),
    totalAmt: findCol(["TOTALAPAGAR", "TOTALAMT", "IMPORTPAGARE", "CUOTATOTAL", "TOTAL", "IMPORT.PAGARE", "IMPORT. PAGARE"]),
    balance: findCol(["SALDO PENDIENTE", "SALDO ACTUAL", "BALANCE", "SALDO", "DEUDA", "SALDO TOTAL", "SALDOTOTAL", "SALDO TOTAL.", "SALDO."]),
    instValue: findCol(["VALORCUOTA", "VALOR DE CUOTA", "VCUOTA", "INSTVALUE", "CUOTA", "VAL. CUOTA", "VAL.CUOTA"]),
    cobrado: findCol(["MONTO COBRADO", "MONTOCOBRADO", "YA COBRADO", "COBRADO", "IMPORTE COBRADO", "COBRADO."]),
    totalInst: findCol(["CUOTAS", "PLAZO", "CTASTOT", "CTAS TOT", "CTAS.TOT", "CTAS. TOT"]),
    paidInst: findCol(["CUOTASPAGADAS", "CTAPAG", "CTA PAG", "CTA.PAG", "CTA. PAG"]),
    pendInst: findCol(["CUOTASATRASADAS", "CUOTASPENDIENTES", "PENDIENTE", "CTASPEND", "CTAS PEND", "CTAS.PEND", "CTAS. PEND"]),
    atraso: findCol(["ATRASO", "DIAS DE ATRASO", "DIAS MORA", "MORA"]),
};

console.log("idxs", idxs);

const targets = ["FLORES", "AYALA SAUCEDO", "CUENCA MARTINEZ"];

rows.forEach((row, i) => {
    let name = String(row[idxs.name ?? -1] || '').trim();
    if (!targets.some(t => name.includes(t))) return;

    let principal = Math.round(parseAmount(row[idxs.principal ?? -1]));
    let totalAmount = Math.round(parseAmount(row[idxs.totalAmt ?? -1]));
    let balance = Math.round(parseAmount(row[idxs.balance ?? -1]));
    let instValue = Math.round(parseAmount(row[idxs.instValue ?? -1]));
    let totalInst = Math.round(parseAmount(row[idxs.totalInst ?? -1]));
    let rawAtraso = row[idxs.atraso ?? -1];
    let diasAtraso = parseDaysDelayed(rawAtraso);

    let paidInst = parseAmount(row[idxs.paidInst ?? -1]);
    let pendInst = parseAmount(row[idxs.pendInst ?? -1]);

    let totalPaidMoney = 0;
    const cobradoRaw = idxs.cobrado !== undefined ? parseAmount(row[idxs.cobrado ?? -1]) : 0;
    const isCobradoMapped = idxs.cobrado !== undefined;

    const rawBalanceStr = String(row[idxs.balance ?? -1] || '').trim();
    let rawExplicitBalance = null;
    if (idxs.balance !== undefined && rawBalanceStr !== '' && rawBalanceStr !== '-') {
        const match = rawBalanceStr.match(/[-+]?\s*\d[0-9.,]*/);
        if (match) {
            const cleanMatch = match[0].replace(/\s+/g, '');
            rawExplicitBalance = Math.round(parseAmount(cleanMatch));
        }
    }

    if (isCobradoMapped) {
        totalPaidMoney = Math.round(cobradoRaw);
        if (rawExplicitBalance !== null && !isNaN(rawExplicitBalance)) {
            balance = rawExplicitBalance;
            if (balance > 0 && totalAmount < balance + totalPaidMoney) {
                totalAmount = balance + totalPaidMoney;
            }
        }
        paidInst = instValue > 0 ? Math.floor(totalPaidMoney / instValue) : paidInst;
    }

    if (principal === 0 && totalAmount > 0) principal = Math.round(totalAmount / 1.15);

    let isRowValid = true;
    let errors = [];
    if (totalAmount <= 0) { errors.push("Monto total inválido"); isRowValid = false; }
    else if (instValue <= 0) { errors.push("Valor cuota 0"); isRowValid = false; }
    else if (balance > totalAmount) { errors.push("Saldo > total"); isRowValid = false; }
    else if (Number.isNaN(balance) || Number.isNaN(totalAmount)) { errors.push("NaN"); isRowValid = false; }

    const loanInitialPaid = Math.round(typeof totalPaidMoney === 'number' && !isNaN(totalPaidMoney) ? totalPaidMoney : Math.max(0, totalAmount - balance));
    
    console.log(`[${name}]`, {
        principal, totalAmount, balance, instValue, totalInst, paidInst, totalPaidMoney, loanInitialPaid, isRowValid, errors, diasAtraso
    });
});
