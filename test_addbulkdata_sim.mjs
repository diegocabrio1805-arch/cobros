const generateAmortizationTable = (principal, intRate, installments, freq, start, country, custom) => {
    return Array.from({length: installments}).map((_, i) => ({
        id: `inst-${i+1}`,
        number: i+1,
        amount: 22000,
        status: 'PENDING',
        paidAmount: 0
    }));
};

const simulate = () => {
    let principal = 1147826;
    let totalAmount = 1320000;
    let instValue = 22000;
    let totalInst = 44;
    let paidInst = 40;
    let pendInst = 4;
    let balance = 440000;
    let loanInitialPaid = 880000; // 40 * 22000
    
    // excelHelper.ts creating the installments
    const installmentsTable = generateAmortizationTable();
    for (let j = 0; j < Math.min(paidInst, installmentsTable.length); j++) {
        installmentsTable[j].status = 'PAID';
        installmentsTable[j].paidAmount = Math.round(installmentsTable[j].amount);
    }
    
    const excelLoan = {
        id: 'L-123',
        totalAmount,
        installmentValue: instValue,
        balance,
        status: balance <= 0 ? 'PAID' : 'ACTIVE',
        installments: installmentsTable
    };
    
    const newLogs = [{
        id: 'LOG-MIG-L-123',
        loanId: 'L-123',
        amount: loanInitialPaid,
        type: 'PAYMENT'
    }];
    
    // addBulkData logic
    const loanLogs = newLogs.filter(log => log.loanId === excelLoan.id && log.type === 'PAYMENT');
    let totalToApply = loanLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
    
    const newInstallments = (excelLoan.installments || []).map(i => ({ ...i }));
    
    console.log("Before applying bulk log:", {
        totalToApply,
        firstInst: newInstallments[0].paidAmount,
        lastInst: newInstallments[newInstallments.length - 1].paidAmount
    });
    
    if (totalToApply > 0) {
        for (let i = 0; i < newInstallments.length && totalToApply > 0.01; i++) {
        const inst = newInstallments[i];
        if (inst.status === 'PAID') continue;

        const remainingInInst = Math.round((inst.amount - (inst.paidAmount || 0)) * 100) / 100;
        const appliedToInst = Math.min(totalToApply, remainingInInst);
        inst.paidAmount = Math.round(((inst.paidAmount || 0) + appliedToInst) * 100) / 100;
        totalToApply = Math.round((totalToApply - appliedToInst) * 100) / 100;
        inst.status = inst.paidAmount >= inst.amount - 0.01 ? 'PAID' : 'PARTIAL';
        }
    }
    
    const allPaid = newInstallments.length > 0 && newInstallments.every(inst => inst.status === 'PAID');
    const totalPaidSoFar = newInstallments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
    const currentBalance = Math.round((excelLoan.totalAmount - totalPaidSoFar) * 100) / 100;
    
    console.log("Final State:", {
        allPaid,
        totalPaidSoFar,
        currentBalance,
        status: allPaid ? 'PAID' : 'ACTIVE',
        unapplied: totalToApply
    });
};

simulate();
