const parseAmount = (input) => {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  let str = String(input).trim();
  if (str === '-' || str === '--') return 0;
  const clean = str.replace(/[^\d.,-]/g, '');
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');
  if (lastComma === -1 && lastDot !== -1) {
    const dots = (clean.match(/\./g) || []).length;
    const afterLastDot = clean.substring(lastDot + 1);
    if (dots > 1) return parseFloat(clean.replace(/\./g, '')) || 0;
    if (afterLastDot.length === 3) return parseFloat(clean.replace(/\./g, '')) || 0;
  }
  if (lastDot > lastComma) {
    return parseFloat(clean.replace(/,/g, '')) || 0;
  } else if (lastComma > lastDot) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  const res = parseFloat(clean);
  return isNaN(res) ? 0 : res;
};

function simulateRow(balanceStr, totalAmount, totalPaidMoney) {
    let rawExplicitBalance = null;
    let balance = 0;
    const str = String(balanceStr || '').trim();
    
    if (str !== '' && str !== '-') {
        const match = str.match(/[-+]?\s*\d[0-9.,]*/);
        if (match) {
            const cleanMatch = match[0].replace(/\s+/g, '');
            rawExplicitBalance = Math.round(parseAmount(cleanMatch));
        }
    }

    const hasExplicitBalance = rawExplicitBalance !== null && !isNaN(rawExplicitBalance) && rawExplicitBalance !== 0;

    if (hasExplicitBalance) {
        balance = rawExplicitBalance;
    } else {
        balance = Math.max(0, totalAmount - totalPaidMoney);
    }

    return {
        input: balanceStr,
        parsedNumber: rawExplicitBalance,
        finalBalance: balance
    };
}

const testCases = [
    { desc: "Caso Normal", val: "50000", total: 100000, paid: 20000 },
    { desc: "Saldo Cero (debe calcular)", val: "0", total: 100000, paid: 20000 },
    { desc: "Saldo Vacío (debe calcular)", val: "", total: 100000, paid: 20000 },
    { desc: "Saldo Guión (debe calcular)", val: "-", total: 100000, paid: 20000 },
    { desc: "Saldo Negativo Limpio", val: "-15000", total: 100000, paid: 120000 },
    { desc: "Saldo Negativo con Texto", val: "saldo a favor - 15000 ok", total: 100000, paid: 120000 },
    { desc: "Saldo Positivo con Signo", val: "+ 20000", total: 100000, paid: 20000 },
    { desc: "Texto Aleatorio Sin Números (debe calcular)", val: "kokok ojon", total: 100000, paid: 20000 },
    { desc: "Saldo Exacto de Planilla Carga", val: "-10000 +kokok -ojon", total: 100000, paid: 110000 },
];

console.log("=== RESULTADOS DE AUDITORIA INTERNA ===");
testCases.forEach(tc => {
    const res = simulateRow(tc.val, tc.total, tc.paid);
    console.log(`\nPrueba: ${tc.desc}`);
    console.log(`  Entrada Planilla : "${res.input}"`);
    console.log(`  Número Extraído  : ${res.parsedNumber}`);
    console.log(`  Saldo Final APP  : ${res.finalBalance}`);
});
