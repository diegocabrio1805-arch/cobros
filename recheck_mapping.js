
const testHeaders = ["NOMBRE", "HABILITADO", "V. CUOTA", "TOTAL CREDITO", "CUOTAS", "CTA. PAG", "ATRASO"];
const testRow = ["CLIENTE PRUEBA", "1.000.000", "50.000", "1.200.000", "24", "10", "0"];

function normalizeHeader(h) {
    return String(h || '').trim().toUpperCase();
}

function findCol(map, internalKey, synonyms) {
    const normalizedSynonyms = synonyms.map(s => s.toUpperCase());
    
    // 1. Exact match
    for (const syn of normalizedSynonyms) {
        if (map[syn] !== undefined) return map[syn];
    }
    
    // 2. Partial match
    const entries = Object.entries(map);
    for (const syn of normalizedSynonyms) {
        const found = entries.find(([h]) => h.includes(syn));
        if (found) return found[1];
    }
    return undefined;
}

const map = {};
testHeaders.forEach((h, i) => map[normalizeHeader(h)] = i);

const pendingSynonyms = ["C. PENDIENTES", "CUOTAS PENDIENTES", "CTAS. PEND", "CTAS PEND", "CTAS. PEND.", "CUOTAS PENDIENTE", "CUOTA PENDIENTE", "CUOTAS PEND", "RESTANTES", "PENDIENTES", "SALDO CUOTAS", "CUOTAS FALTANTES", "COBRAR CUOTAS", "FALTANTES", "PENDIENTE", "RESTANTE", "DEUDA CUOTAS", "PEN", "CP"];
const paidSynonyms = ["FECHA ULTIMO PAGO", "ULTIMO PAGO", "C. PAGADAS", "CUOTAS PAGADAS", "CTA. PAG", "CTA PAG", "CTA. PAG.", "CUOTAS PAG", "CANT. PAG.", "PAGADAS", "CUOTAS COBRADAS", "CUOTAS TIENE", "COBRADAS", "PAGAS", "YA PAGAS", "ABONADAS", "CANCELADAS", "PAGOS", "PAG", "CPG"];
const totalSynonyms = ["CUOTAS TOTALES", "CUOTAS TOT", "PLAZO", "CANT. CUOTAS", "CANT CUOTAS", "CANT CUOTA", "TOTAL CTAS", "NRO CUOTAS", "TIEMPO", "MESES", "SEMANAS", "CUOTAS", "CANT", "TOTAL CUOTAS"];

const pendingIdx = findCol(map, 'pendingInstallments', pendingSynonyms);
const paidIdx = findCol(map, 'paidInstallments', paidSynonyms);
const totalIdx = findCol(map, 'totalInstallments', totalSynonyms);

console.log("--- RESULTADOS DE MAPEADO (V2) ---");
console.log(`Cabecera 'CTA. PAG' mapeada a: ${paidIdx === 5 ? 'PAID (CORRECTO)' : (pendingIdx === 5 ? 'PENDING (ERROR - COLISIÓN)' : 'NADA')}`);
console.log(`Total Cuotas mapeado a: ${totalIdx === 4 ? 'EXISTENTE (CORRECTO)' : 'ERROR'}`);

console.log("\n--- SIMULACIÓN DE CÁLCULO ---");
const paid = parseInt(testRow[paidIdx]);
const total = parseInt(testRow[totalIdx]);
const instValue = 50000;
const totalAmount = total * instValue;
const balance = (total - paid) * instValue;

console.log(`Dato Cuotas Pagadas: ${paid}`);
console.log(`Dato Total Cuotas: ${total}`);
console.log(`Total Amount: ${totalAmount}`);
console.log(`Saldo Final: ${balance}`);

if (balance === 700000 && paidIdx === 5 && pendingIdx === undefined) {
    console.log("\n✅ PRUEBA EXITOSA: La colisión se resolvió y el saldo es correcto.");
} else {
    console.log("\n❌ PRUEBA FALLIDA: Verificar lógica de sinónimos.");
}
