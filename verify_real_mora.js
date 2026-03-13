
const Frequency = {
    DAILY: 'Diaria',
    WEEKLY: 'Semanal',
    BIWEEKLY: 'Quincenal',
    MONTHLY: 'Mensual'
};

const isHoliday = (date, country, customHolidays = []) => {
    if (!date || isNaN(date.getTime())) return false;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateStr = date.toISOString().split('T')[0];

    // Feriados Nacionales Colombia (Formato aproximado 2025/2026)
    if (country === 'CO') {
        const fixedHolidays = [
            '01-01', '01-06', '03-24', '04-17', '04-18', '05-01', '05-19',
            '06-09', '06-16', '06-23', '06-30', '07-20', '08-07', '08-18',
            '10-13', '11-03', '11-17', '12-08', '12-25'
        ];
        if (fixedHolidays.includes(`${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)) return true;
    }
    return false;
};

const calculateTotalReturn = (amount, rate) => {
    return Number(amount) * (1 + Number(rate) / 100);
};

const generateAmortizationTable = (
    amount,
    rate,
    installments,
    frequency,
    startDate,
    country,
    customHolidays = []
) => {
    const numAmount = Number(amount);
    const numRate = Number(rate);
    const numInstallments = Number(installments);

    const totalAmount = calculateTotalReturn(numAmount, numRate);
    const installmentValue = Math.ceil(totalAmount / (numInstallments || 1));
    const table = [];

    let currentDate;
    if (typeof startDate === "string") {
        if (startDate.includes('/') && !startDate.includes('-')) {
            const parts = startDate.split(' ')[0].split('/');
            if (parts[0].length === 2) {
                currentDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
            } else {
                currentDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`);
            }
        } else {
            const cleanStartDate = startDate.split(" ")[0].split("T")[0];
            currentDate = new Date(cleanStartDate + "T00:00:00");
        }
    } else {
        currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);
    }

    for (let i = 1; i <= numInstallments; i++) {
        if (frequency === Frequency.DAILY) {
            currentDate.setDate(currentDate.getDate() + 1);
        } else if (frequency === Frequency.WEEKLY) {
            currentDate.setDate(currentDate.getDate() + 7);
        }

        let safetyCounter = 0;
        while ((currentDate.getDay() === 0 || isHoliday(currentDate, country, customHolidays)) && safetyCounter < 45) {
            currentDate.setDate(currentDate.getDate() + 1);
            safetyCounter++;
        }

        table.push({
            number: i,
            dueDate: currentDate.toISOString().split('T')[0],
            amount: i === numInstallments ? totalAmount - (installmentValue * (numInstallments - 1)) : installmentValue,
            status: 'pending'
        });
    }
    return table;
};

const getDaysOverdue = (loan, settings, customTotalPaid) => {
    // MOCK TODAY to 2026-02-09
    const todayStr = '2026-02-09';
    const today = new Date(todayStr + 'T00:00:00');

    const totalPaid = customTotalPaid !== undefined
        ? Number(customTotalPaid)
        : (loan.installments || []).reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);

    const virtualInstallments = generateAmortizationTable(
        loan.principal,
        loan.interestRate,
        loan.totalInstallments,
        loan.frequency,
        loan.createdAt,
        settings?.country || 'CO',
        []
    );

    let accumulatedPaid = totalPaid;
    const firstUnpaidInstallment = virtualInstallments.find(inst => {
        const amount = Number(inst.amount) || 0;
        if (accumulatedPaid >= amount - 0.1) {
            accumulatedPaid -= amount;
            return false;
        }
        return true;
    });

    if (!firstUnpaidInstallment) return 0;

    const cleanDueDateStr = firstUnpaidInstallment.dueDate.split('T')[0];
    const firstDueDate = new Date(cleanDueDateStr + 'T00:00:00');

    if (firstDueDate >= today) {
        console.log(`[DEBUG] Al día. Prox Venc: ${cleanDueDateStr}`);
        return 0;
    }

    let delayedWorkingDays = 0;
    let tempDate = new Date(firstDueDate);

    while (tempDate < today) {
        tempDate.setDate(tempDate.getDate() + 1);
        if (tempDate >= today) break;

        const isSun = tempDate.getDay() === 0;
        const isHol = isHoliday(tempDate, settings?.country || 'CO', []);

        if (!isSun && !isHol) {
            delayedWorkingDays++;
        }
    }

    console.log(`[DEBUG] Start: ${loan.createdAt} | FirstDue: ${cleanDueDateStr} | Today: ${todayStr} | Mora: ${delayedWorkingDays}`);
    return delayedWorkingDays;
};

// --- TEST CASE ---
const loan = {
    principal: 500000,
    interestRate: 20,
    totalInstallments: 24,
    frequency: 'Diaria',
    createdAt: '2025-11-11T10:00:00', // CASO REAL CLAUDIA MAVEL
    installments: []
};

console.log("=== VERIFICACION DE MORA (Caso Real) ===");
const mora = getDaysOverdue(loan, { country: 'CO' }, 0);
console.log("Dias de Mora Calculados:", mora);
