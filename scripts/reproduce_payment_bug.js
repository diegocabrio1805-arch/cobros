
// Mock Enums and Types
const PaymentStatus = { PAID: 'PAID', PARTIAL: 'PARTIAL', PENDING: 'PENDING' };
const LoanStatus = { PAID: 'PAID', ACTIVE: 'ACTIVE' };
const CollectionLogType = { PAYMENT: 'PAYMENT' };

// Mock State
let loan = {
    id: 'loan-1',
    principal: 100000,
    installments: Array.from({ length: 10 }, (_, i) => ({
        number: i + 1,
        amount: 10000, // 10k per installment
        paidAmount: 0,
        status: PaymentStatus.PENDING
    }))
};

// logic from App.tsx (simulate addCollectionAttempt)
function performPayment(paymentAmount) {
    console.log(`\n\n--- Attempting Payment of ${paymentAmount} ---`);
    let newLog = { type: CollectionLogType.PAYMENT, amount: paymentAmount, loanId: loan.id };

    let updatedLoan = { ...loan };
    let totalToApply = Math.round(newLog.amount * 100) / 100;

    const newInstallments = (loan.installments || []).map(i => ({ ...i })); // deep copy elements

    // Loop
    for (let i = 0; i < newInstallments.length && totalToApply > 0.01; i++) {
        const inst = newInstallments[i];
        if (inst.status === PaymentStatus.PAID) continue;

        const remainingInInst = Math.round((inst.amount - (inst.paidAmount || 0)) * 100) / 100;
        const appliedToInst = Math.min(totalToApply, remainingInInst);

        inst.paidAmount = Math.round(((inst.paidAmount || 0) + appliedToInst) * 100) / 100;
        totalToApply = Math.round((totalToApply - appliedToInst) * 100) / 100;
        inst.status = inst.paidAmount >= inst.amount - 0.01 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

        console.log(`Inst ${inst.number}: Paid ${inst.paidAmount}/${inst.amount} (Applied: ${appliedToInst}) -> Status: ${inst.status}`);
    }

    // Status Logic - THE CRITICAL CHECK
    const allPaid = newInstallments.length > 0 && newInstallments.every(inst => inst.status === PaymentStatus.PAID);

    updatedLoan.installments = newInstallments;
    updatedLoan.status = allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE;

    console.log(`\nLOAN STATUS RESULT: ${updatedLoan.status}`);
    console.log(`AllPaid Check: ${allPaid}`);

    // Verify installments status
    const pendingCount = newInstallments.filter(i => i.status !== PaymentStatus.PAID).length;
    console.log(`Pending Installments: ${pendingCount}`);

    return updatedLoan;
}

// Test Case 1: Partial Payment of 5000 (Should be ACTIVE)
loan = performPayment(5000);

// Test Case 2: Pay remaining 5000 of first + 10000 of second (Total 15000) (Should be ACTIVE)
// Reset for clear test? Or continue. Let's continue.
// loan = performPayment(15000);

// Test Case 3: Pay EVERYTHING (Should be PAID)
// loan = performPayment(900000);
