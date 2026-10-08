const parseAmount = (input) => {
    if (typeof input === 'number') return input;
    if (!input) return 0;
    let str = String(input).trim();
    if (str === '-' || str === '--' || str === '0100-01-01') return 0;
    const clean = str.replace(/[^\d.,-]/g, '');
    const lastDot = clean.lastIndexOf('.');
    const lastComma = clean.lastIndexOf(',');
    if (lastComma === -1 && lastDot !== -1) {
        const dots = (clean.match(/\./g) || []).length;
        const afterLastDot = clean.substring(lastDot + 1);
        if (dots > 1) return parseFloat(clean.replace(/\./g, '')) || 0;
        if (afterLastDot.length === 3) return parseFloat(clean.replace(/\./g, '')) || 0;
    }
    if (lastDot > lastComma) return parseFloat(clean.replace(/,/g, '')) || 0;
    else if (lastComma > lastDot) return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    const res = parseFloat(clean);
    return isNaN(res) ? 0 : res;
};

const rows = [
  [
    8702, 'FLORES , TERESA RAMONA', 2025000, 1500000, 675000, 1350000,
    46247, 33750, 20, 60, 40, 46337, 46337, 0, 46300, 'CAPIATA',
    971475060, 'EXE', 42, 211, 131
  ],
  [
    7358, 'AYALA SAUCEDO, CECILIA DEL ROCIO', 2025000, 1500000, 276820,
    1748180, 46081, 33750, 8.202074074074076, 60, 51.797925925925924,
    46171, 46171, 132, 46302, 'SAN LORENZO', 982565234, 'P', 42, 211, 131
  ],
  [
    8774, 'CUENCA MARTINEZ, CINTHIA CAROLINA', 2025000, 1500000, 640000,
    1385000, 46254, 33750, 18.962962962962962, 60, 41.03703703703704,
    46344, 46344, 0, 46302, 'SAN LORENZO', 985195209, 'EXE', 42, 211, 131
  ]
];

const idxs = { docId: 0, name: 1, totalAmt: 2, principal: 3, balance: 4, cobrado: 5, date: 6, instValue: 7, pendInst: 8, totalInst: 9, paidInst: 10, atraso: 13 };

rows.forEach(row => {
    let name = String(row[idxs.name] || '').trim();
    let principal = Math.round(parseAmount(row[idxs.principal]));
    let totalAmount = Math.round(parseAmount(row[idxs.totalAmt]));
    let balance = Math.round(parseAmount(row[idxs.balance]));
    let instValue = Math.round(parseAmount(row[idxs.instValue]));
    let totalInst = Math.round(parseAmount(row[idxs.totalInst]));
    
    let paidInst = parseAmount(row[idxs.paidInst]);
    let pendInst = parseAmount(row[idxs.pendInst]);
    
    let totalPaidMoney = Math.round(parseAmount(row[idxs.cobrado]));
    const rawBalanceStr = String(row[idxs.balance] || '').trim();
    
    let rawExplicitBalance = null;
    if (rawBalanceStr !== '' && rawBalanceStr !== '-') {
        const match = rawBalanceStr.match(/[-+]?\s*\d[0-9.,]*/);
        if (match) rawExplicitBalance = Math.round(parseAmount(match[0].replace(/\s+/g, '')));
    }

    if (totalAmount === 0 && instValue > 0 && totalInst > 0) totalAmount = instValue * totalInst;
    
    if (rawExplicitBalance !== null && !isNaN(rawExplicitBalance)) {
        balance = rawExplicitBalance;
        if (balance > 0 && totalAmount < balance + totalPaidMoney) totalAmount = balance + totalPaidMoney;
    } else {
        balance = Math.max(0, totalAmount - totalPaidMoney);
    }
    
    paidInst = instValue > 0 ? Math.floor(totalPaidMoney / instValue) : paidInst;
    if (principal === 0 && totalAmount > 0) principal = Math.round(totalAmount / 1.15);

    let isRowValid = true;
    let errors = [];
    if (totalAmount <= 0) { errors.push("Monto total inválido"); isRowValid = false; }
    else if (instValue <= 0) { errors.push("Valor cuota 0"); isRowValid = false; }
    else if (balance > totalAmount) { errors.push("Saldo > total"); isRowValid = false; }
    else if (Number.isNaN(balance) || Number.isNaN(totalAmount)) { errors.push("NaN"); isRowValid = false; }

    const loanInitialPaid = Math.round(typeof totalPaidMoney === 'number' && !isNaN(totalPaidMoney) ? totalPaidMoney : Math.max(0, totalAmount - balance));
    
    console.log(`[${name}]`, { principal, totalAmount, balance, instValue, totalInst, totalPaidMoney, loanInitialPaid, isRowValid, errors });
});
