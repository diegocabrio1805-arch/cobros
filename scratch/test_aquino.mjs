import { parseAmount } from '../utils/helpers.js';

function testAQUINO() {
    let principal = 1500000;
    let totalAmount = 2025000;
    let balance = 801000;
    let instValue = 33750;
    let totalInst = 60;
    let paidInst = 36.26;
    let pendInst = 23.73;
    let cobradoRaw = 1224000;
    let isCobradoMapped = true;
    let rawExplicitBalance = 801000;
    let rawBalanceStr = "801000";

    let totalPaidMoney = 0;

    if (isCobradoMapped) {
        totalPaidMoney = Math.round(cobradoRaw);
        if (totalAmount === 0 && instValue > 0 && totalInst > 0) totalAmount = instValue * totalInst;
        
        if (rawExplicitBalance !== null && !isNaN(rawExplicitBalance)) {
            balance = rawExplicitBalance;
            if (balance > 0 && totalAmount < balance + totalPaidMoney) {
                totalAmount = balance + totalPaidMoney;
            }
        } else {
            balance = Math.max(0, totalAmount - totalPaidMoney);
        }
        
        paidInst = instValue > 0 ? Math.floor(totalPaidMoney / instValue) : paidInst;
        console.log(`[FORENSIC] SALDO Y MONTO COBRADO explícito: cobrado=${totalPaidMoney}, total=${totalAmount}, saldo=${balance}`);
    }

    if (principal === 0 && totalAmount > 0) principal = Math.round(totalAmount / 1.15);

    let isRowValid = true;
    let errors = [];
    if (totalAmount <= 0) {
        errors.push({ reason: "Monto total inválido o en cero." });
        isRowValid = false;
    } else if (instValue <= 0) {
        errors.push({ reason: "El valor de la cuota está en cero." });
        isRowValid = false;
    } else if (balance > totalAmount) {
        errors.push({ reason: `Saldo inválido (Mayor al total).` });
        isRowValid = false;
    } else if (Number.isNaN(balance) || Number.isNaN(totalAmount)) {
        errors.push({ reason: "Contiene valores de texto donde van números." });
        isRowValid = false;
    }

    console.log({ principal, totalAmount, instValue, totalInst, balance, totalPaidMoney, isRowValid, errors });
}

testAQUINO();
