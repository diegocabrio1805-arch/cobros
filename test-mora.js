
import { Frequency, LoanStatus } from './types.js';

// Mock minimal helpers for testing
const getLocalDateStringForCountry = (country = 'CO') => {
    const now = new Date();
    const options = {
        timeZone: country === 'PY' ? 'America/Asuncion' : 'America/Bogota',
        year: 'numeric', month: '2-digit', day: '2-digit'
    };
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    return `${year}-${month}-${day}`;
};

const generateAmortizationTable = (amount, rate, installments, frequency, startDate, country) => {
    const totalAmount = amount * (1 + rate / 100);
    const instVal = Math.ceil(totalAmount / (installments || 1));
    const table = [];
    const cleanStartDate = startDate.split(' ')[0].split('T')[0];
    let currentDate = new Date(cleanStartDate + 'T00:00:00');

    for (let i = 1; i <= installments; i++) {
        if (frequency === 'Diaria') currentDate.setDate(currentDate.getDate() + 1);
        else if (frequency === 'Semanal') currentDate.setDate(currentDate.getDate() + 7);

        // Skip Sundays
        while (currentDate.getDay() === 0) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        table.push({
            number: i,
            dueDate: currentDate.toISOString().split('T')[0],
            amount: instVal
        });
    }
    return table;
};

const getDaysOverdue = (loan, settings, customTotalPaid) => {
    const todayStr = getLocalDateStringForCountry(settings?.country || 'CO');
    const today = new Date(todayStr + 'T00:00:00');

    const totalLoanAmount = Number(loan.totalAmount) || 0;
    const installmentVal = Number(loan.installmentValue) || (totalLoanAmount / (loan.totalInstallments || 1)) || 1;

    let installments = loan.installments;
    if (!installments || installments.length === 0) {
        installments = generateAmortizationTable(loan.principal, loan.interestRate, loan.totalInstallments, loan.frequency, loan.createdAt, settings?.country || 'CO');
    }

    const totalPaid = customTotalPaid !== undefined ? Number(customTotalPaid) : 0;
    if (totalPaid >= totalLoanAmount - 1) return 0;

    const dueBeforeTodayCount = installments.filter(inst => {
        const dueDate = new Date(inst.dueDate + 'T00:00:00');
        return dueDate < today;
    }).length;

    const paidCount = totalPaid / installmentVal;
    const mora = dueBeforeTodayCount - paidCount;
    return Math.max(0, Math.ceil(mora - 0.01));
};

// TEST CASE 1: Loan started 10 days ago, Daily, 0 paid.
const loan1 = {
    principal: 500000,
    interestRate: 20,
    totalInstallments: 24,
    frequency: 'Diaria',
    totalAmount: 600000,
    installmentValue: 25000,
    createdAt: '2026-01-27T10:00:00',
    installments: []
};

console.log("Today is:", getLocalDateStringForCountry('CO'));
console.log("Test 1 (0 paid):", getDaysOverdue(loan1, { country: 'CO' }, 0));
console.log("Test 1 (25000 paid = 1 inst):", getDaysOverdue(loan1, { country: 'CO' }, 25000));
console.log("Test 1 (50000 paid = 2 inst):", getDaysOverdue(loan1, { country: 'CO' }, 50000));
console.log("Test 1 (All paid):", getDaysOverdue(loan1, { country: 'CO' }, 600000));
