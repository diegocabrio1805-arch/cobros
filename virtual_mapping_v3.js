
// SIMULACIÓN INTEGRAL DE IMPORTACIÓN (FASE 3 - VIRTUAL MAPPING)

// 1. Datos del Excel del Usuario (según capturas)
const HEADERS = ["OP. Nº", "NOMBRE / RAZON SOCIAL", "IMPORT.PAGARE", "MONTO COBRADO", "SALDO", "FEC.DES.", "VAL. CUOTA", "CTAS.TOT"];

const ROW_JACINTO = ["45678", "GOMEZ, JACINTO", "1.200.000", "400.000", "800.000", "20/01/2026", "50.000", "24"];
const ROW_MILNER = ["98765", "CHAPARRO ALONSO, MILNER PAOLO", "1.320.000", "330.000", "990.000", "15/01/2026", "55.000", "24"];

// 2. Lógica de Mapeo (Simulada de excelHelper.ts - Fase 3)
function simulateExcelImport(headers, row) {
    const map = {};
    headers.forEach((h, i) => map[h.toUpperCase()] = i);

    // Sinónimos configurados en Fase 3
    const findIndex = (syns) => {
        for(let s of syns) if(map[s] !== undefined) return map[s];
        return -1;
    };

    const nameIdx = findIndex(["NOMBRE / RAZON SOCIAL", "NOMBRE", "CLIENTE"]);
    const docIdIdx = findIndex(["OP. Nº", "OP", "NRO OP", "CEDULA"]);
    const totalAmountIdx = findIndex(["IMPORT.PAGARE", "MONTO TOTAL", "MONTO"]);
    const paidAmountTotalIdx = findIndex(["MONTO COBRADO", "TOTAL COBRADO", "PAGADO"]);
    const balanceIdx = findIndex(["SALDO", "SALDO ACTUAL"]);
    const instValueIdx = findIndex(["VAL. CUOTA", "V. CUOTA", "CUOTA"]);
    const totalInstIdx = findIndex(["CTAS.TOT", "CUOTAS", "CANT"]);

    const parseNum = (val) => parseFloat(String(val || 0).replace(/\./g, '').replace(',', '.')) || 0;

    const name = row[nameIdx];
    const docId = row[docIdIdx];
    const totalAmount = parseNum(row[totalAmountIdx]);
    const paidAmountExcel = parseNum(row[paidAmountTotalIdx]);
    const balanceExcel = parseNum(row[balanceIdx]);
    const totalInst = parseNum(row[totalInstIdx]) || 24;
    const instValue = parseNum(row[instValueIdx]);

    // LÓGICA FASE 3: Cuotas siempre PENDING inicialmente
    const installments = [];
    for(let i=1; i<=totalInst; i++) {
        installments.push({ number: i, amount: instValue, status: 'PENDING', paidAmount: 0 });
    }

    // LÓGICA FASE 3: Log basado en Monto Cobrado o Saldo
    let logAmount = paidAmountExcel > 0 ? paidAmountExcel : (totalAmount - balanceExcel);

    return {
        loan: { id: 'L-' + docId, totalAmount, installments, balance: totalAmount }, // Balance inicial = total
        log: { amount: logAmount, loanId: 'L-' + docId, clientName: name }
    };
}

// 3. Lógica de Aplicación (Simulada de useAppActions.ts - addBulkData)
function simulateBulkApply(loan, log) {
    let money = log.amount;
    const updatedInstallments = loan.installments.map(inst => {
        if (money <= 0) return inst;
        
        let toPay = Math.min(money, inst.amount);
        money -= toPay;
        
        return {
            ...inst,
            paidAmount: toPay,
            status: toPay >= inst.amount ? 'PAID' : 'PENDING'
        };
    });

    const totalPaid = updatedInstallments.reduce((sum, i) => sum + i.paidAmount, 0);
    const finalBalance = loan.totalAmount - totalPaid;

    return { ...loan, installments: updatedInstallments, totalPaid, balance: finalBalance };
}

// --- EJECUCIÓN DEL TEST ---
console.log("=== SIMULACIÓN VIRTUAL FASE 3 ===\n");

[ROW_JACINTO, ROW_MILNER].forEach(row => {
    const imported = simulateExcelImport(HEADERS, row);
    const finalState = simulateBulkApply(imported.loan, imported.log);

    console.log(`Cliente: ${imported.log.clientName}`);
    console.log(`- Mapeo ID (Op. Nº): ${imported.loan.id}`);
    console.log(`- Monto Total detected: ${imported.loan.totalAmount}`);
    console.log(`- Pago Aplicado (Log): ${imported.log.amount}`);
    console.log(`- Saldo Final Resultante: ${finalState.balance}`);
    
    if (finalState.balance > 0) {
        console.log("✅ RESULTADO: El saldo NO es cero. La Fase 3 funciona.");
    } else {
        console.log("❌ ERROR: El saldo resultó en cero. Verificar lógica.");
    }
    console.log("----------------------------------\n");
});
