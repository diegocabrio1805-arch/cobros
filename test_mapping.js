
const normalizeHeader = (s) => 
    String(s || '')
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^A-Z0-9]/g, "")       
        .trim();

const findCol = (map, internalKey, synonyms) => {
    if (!map) return undefined;
    for (const s of synonyms) {
        const sNorm = normalizeHeader(s);
        if (map[sNorm] !== undefined) {
            return map[sNorm];
        }
        const partial = Object.keys(map).find(k => k.includes(sNorm) || sNorm.includes(k));
        if (partial !== undefined) {
            return map[partial];
        }
    }
    return undefined;
};

const userHeaders = ["HABILITADO", "V. CUOTA", "MONTO", "SALDO ACTUAL", "CUOTAS", "PAGADAS", "ATRASO"];
const map = {};
userHeaders.forEach((val, idx) => {
    const key = normalizeHeader(val);
    if (key) map[key] = idx;
});

console.log("Headers Map:", map);

// Current Logic Synonyms
const totalInstallmentsSynonyms = ["ATRASO", "CUOTAS TOTALES", "CUOTAS TOT", "CANT. CUOTAS", "CANT CUOTAS", "PLAZO", "TOTAL CTAS", "NRO CUOTAS", "TIEMPO", "MESES", "SEMANAS"];

const totalInstIdx = findCol(map, 'totalInstallments', totalInstallmentsSynonyms);

console.log("\n--- TEST CURRENT LOGIC ---");
console.log("totalInstallments index:", totalInstIdx);
if (totalInstIdx !== undefined) {
    console.log("Mapped header for totalInstallments:", userHeaders[totalInstIdx]);
}

if (userHeaders[totalInstIdx] === "ATRASO") {
    console.log("❌ BUG CONFIRMED: 'totalInstallments' is mapping to 'ATRASO' because it is first in the synonyms list.");
} else {
    console.log("✅ OK: Mapping to logic is different.");
}
