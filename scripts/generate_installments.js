
const loanId = 'rzlvatgsf';
const totalInstallments = 44;
const installmentValue = 16000;
const startDate = new Date('2026-01-26T18:38:27Z');
const holidays = []; // Loan had empty holidays

const installments = [];
for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(startDate.getDate() + (i - 1));

    // First installment is paid (based on the user's request and image evidence)
    const status = i === 1 ? 'Pagado' : 'Pendiente';
    const paidAmount = i === 1 ? 16000 : 0;

    installments.push({
        number: i,
        amount: installmentValue,
        dueDate: dueDate.toISOString().split('T')[0],
        status: status,
        paidAmount: paidAmount
    });
}

const sql = `UPDATE loans SET installments = '${JSON.stringify(installments)}' WHERE id = '${loanId}';`;
process.stdout.write(sql);
