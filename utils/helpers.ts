import { v4 as uuidv4 } from 'uuid';
import { Client, Loan, CollectionLog, AppSettings, CountryCode, Frequency } from '../types';

export const generateUUID = (): string => {
  return uuidv4();
};

export const getLocalDateStringForCountry = (country: string = 'CO'): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: country === 'PY' ? 'America/Asuncion' : 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(now);
};

export const formatFullDateTime = (country: string = 'CO'): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: country === 'PY' ? 'America/Asuncion' : 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  return new Intl.DateTimeFormat('es-ES', options).format(now);
};

export const formatCountryTime = (country: CountryCode): string => {
  return formatFullDateTime(country);
};

export const getCountryName = (country: CountryCode): string => {
  const names: Record<CountryCode, string> = {
    'CO': 'Colombia',
    'PY': 'Paraguay',
    'PA': 'Panamá',
    'EC': 'Ecuador',
    'SV': 'El Salvador',
    'GT': 'Guatemala',
    'HN': 'Honduras',
    'MX': 'México',
    'NI': 'Nicaragua',
    'CR': 'Costa Rica',
    'DO': 'Rep. Dominicana'
  };
  return names[country] || 'Colombia';
};

export const isHoliday = (date: Date, country: string, customHolidays: string[] = []): boolean => {
  const dateStr = date.toISOString().split('T')[0];
  if (customHolidays.includes(dateStr)) return true;
  return false;
};

export const formatCurrency = (value: number | undefined, settings: AppSettings): string => {
  if (value === undefined) return '$0';
  const currencySymbol = settings.currencySymbol || '$';
  return `${currencySymbol}${Math.round(value).toLocaleString('es-CO')}`;
};

export const calculateTotalReturn = (amount: number, rate: number): number => {
  return amount * (1 + rate / 100);
};

export const generateAmortizationTable = (
  amount: number,
  rate: number,
  installments: number,
  frequency: Frequency,
  startDate: string,
  country: string,
  customHolidays: string[] = []
) => {
  const totalAmount = calculateTotalReturn(amount, rate);
  const installmentValue = Math.ceil(totalAmount / installments);
  const table = [];
  let currentDate = new Date(startDate + 'T00:00:00');

  for (let i = 1; i <= installments; i++) {
    // Calcular siguiente fecha según frecuencia
    if (frequency === Frequency.DAILY) {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (frequency === Frequency.WEEKLY) {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (frequency === Frequency.BIWEEKLY) {
      currentDate.setDate(currentDate.getDate() + 15);
    } else if (frequency === Frequency.MONTHLY) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Saltar domingos y festivos
    while (currentDate.getDay() === 0 || isHoliday(currentDate, country, customHolidays)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    table.push({
      number: i,
      dueDate: currentDate.toISOString().split('T')[0],
      amount: i === installments ? totalAmount - (installmentValue * (installments - 1)) : installmentValue,
      status: 'pending'
    });
  }
  return table;
};

export const getDaysOverdue = (loan: Loan, settings: AppSettings, customTotalPaid?: number): number => {
  const todayStr = getLocalDateStringForCountry(settings.country);
  const today = new Date(todayStr + 'T00:00:00');

  const totalPaid = customTotalPaid !== undefined
    ? customTotalPaid
    : (loan.installments || []).reduce((acc, i) => acc + (i.paidAmount || 0), 0);

  if (totalPaid >= loan.totalAmount - 0.01) return 0;

  const paidCount = Math.floor((totalPaid + 0.01) / (loan.installmentValue || 1));

  if (!loan.installments || loan.installments.length <= paidCount) return 0;

  const nextDueDate = new Date(loan.installments[paidCount].dueDate + 'T00:00:00');

  if (today <= nextDueDate) return 0;

  let diffDays = 0;
  let tempDate = new Date(nextDueDate);
  while (tempDate < today) {
    tempDate.setDate(tempDate.getDate() + 1);
    if (tempDate.getDay() !== 0 && !isHoliday(tempDate, settings.country, loan.customHolidays || [])) {
      diffDays++;
    }
  }
  return diffDays;
};

export const calculateOverdueDays = (dueDate: string, country: string, loan: Loan): number => {
  const today = new Date(getLocalDateStringForCountry(country) + 'T00:00:00');
  const due = new Date(dueDate + 'T00:00:00');
  if (today <= due) return 0;

  let diffDays = 0;
  let tempDate = new Date(due);
  while (tempDate < today) {
    tempDate.setDate(tempDate.getDate() + 1);
    if (tempDate.getDay() !== 0 && !isHoliday(tempDate, country, loan.customHolidays || [])) {
      diffDays++;
    }
  }
  return diffDays;
};

export const compressImage = (base64: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64);
  });
};

export interface ReceiptData {
  clientName: string;
  amountPaid: number;
  loanId: string;
  startDate: string;
  expiryDate: string;
  daysOverdue: number;
  remainingBalance: number;
  paidInstallments: number;
  totalInstallments: number;
  isRenewal?: boolean;
}

export const generateReceiptText = (data: ReceiptData, settings: AppSettings) => {
  const company = settings.companyName || 'ANEXO COBRO';
  const currencySymbol = settings.currencySymbol || '$';

  return `
===============================
       ${company}
===============================
FECHA: ${formatFullDateTime(settings.country)}
CLIENTE: ${data.clientName}
ABONO: ${currencySymbol}${data.amountPaid.toLocaleString('es-CO')}
SALDO: ${currencySymbol}${data.remainingBalance.toLocaleString('es-CO')}
===============================
CUOTAS: ${data.paidInstallments} / ${data.totalInstallments}
VENCE: ${data.expiryDate}
ATRASO: ${data.daysOverdue} dias
===============================
${data.isRenewal ? '*** RENOVACION ***' : ''}
`;
};

export const generateNoPaymentReceiptText = (data: ReceiptData, settings: AppSettings) => {
  const company = settings.companyName || 'ANEXO COBRO';
  const currencySymbol = settings.currencySymbol || '$';
  return `
===============================
       NOTIFICACION
===============================
CLIENTE: ${data.clientName}
FECHA: ${formatFullDateTime(settings.country)}
SALDO: ${currencySymbol}${data.remainingBalance.toLocaleString('es-CO')}
===============================
`;
};

export const convertReceiptForWhatsApp = (receiptText: string): string => {
  return receiptText.replace(/<GS[012]>/g, '').replace(/<B[01]>/g, '');
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
