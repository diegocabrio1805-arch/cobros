
import { Frequency, Installment, PaymentStatus, Loan, CollectionLog, CollectionLogType, CountryCode, Language, AppSettings } from '../types';

// Mapeo de códigos de país a zonas horarias IANA
export const COUNTRY_TIMEZONES: Record<CountryCode, string> = {
  CO: 'America/Bogota', AR: 'America/Argentina/Buenos_Aires', BO: 'America/La_Paz',
  BR: 'America/Sao_Paulo', CL: 'America/Santiago', EC: 'America/Guayaquil',
  GY: 'America/Guyana', PY: 'America/Asuncion', PE: 'America/Lima',
  SR: 'America/Paramaribo', UY: 'America/Montevideo', VE: 'America/Caracas',
  BZ: 'America/Belize', CR: 'America/Costa_Rica', SV: 'America/El_Salvador',
  GT: 'America/Guatemala', HN: 'America/Tegucigalpa', NI: 'America/Managua',
  PA: 'America/Panama', CA: 'America/Toronto', US: 'America/New_York',
  MX: 'America/Mexico_City', DO: 'America/Santo_Domingo', CU: 'America/Havana',
  HT: 'America/Port-au-Prince', JM: 'America/Jamaica', TT: 'America/Port_of_Spain',
  BS: 'America/Nassau', BB: 'America/Barbados', LC: 'America/St_Lucia',
  VC: 'America/St_Vincent', GD: 'America/Grenada', AG: 'America/Antigua',
  DM: 'America/Dominica', KN: 'America/St_Kitts'
};

// Obtiene el nombre del país para mostrar en el sidebar
export const getCountryName = (code: CountryCode): string => {
  const names: Record<CountryCode, string> = {
    CO: 'Colombia', AR: 'Argentina', BO: 'Bolivia', BR: 'Brasil', CL: 'Chile',
    EC: 'Ecuador', GY: 'Guyana', PY: 'Paraguay', PE: 'Perú', SR: 'Surinam',
    UY: 'Uruguay', VE: 'Venezuela', BZ: 'Belice', CR: 'Costa Rica', SV: 'El Salvador',
    GT: 'Guatemala', HN: 'Honduras', NI: 'Nicaragua', PA: 'Panamá', CA: 'Canadá',
    US: 'EE.UU.', MX: 'México', DO: 'Rep. Dominicana', CU: 'Cuba', HT: 'Haití',
    JM: 'Jamaica', TT: 'Trinidad y T.', BS: 'Bahamas', BB: 'Barbados',
    LC: 'Santa Lucía', VC: 'San Vicente', GD: 'Granada', AG: 'Antigua',
    DM: 'Dominica', KN: 'San Cristóbal'
  };
  return names[code] || code;
};

// Obtiene la fecha actual en formato YYYY-MM-DD específica para el país
export const getLocalDateStringForCountry = (country: CountryCode): string => {
  const tz = COUNTRY_TIMEZONES[country] || 'UTC';
  const formatter = new Intl.DateTimeFormat('en-CA', { // format en-CA da YYYY-MM-DD
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

// Obtiene la hora actual formateada según el país
export const getNowInCountry = (country: CountryCode): Date => {
  const tz = COUNTRY_TIMEZONES[country] || 'UTC';
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: tz }));
};

// Formatea la hora específica del país para el sidebar
export const formatCountryTime = (country: CountryCode): string => {
  const tz = COUNTRY_TIMEZONES[country] || 'UTC';
  return new Date().toLocaleTimeString('es-CO', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Definición básica de festivos fijos (Mes-Día) para todos los países de América
const HOLIDAYS: Record<CountryCode, string[]> = {
  CO: ['01-01', '05-01', '07-20', '08-07', '12-08', '12-25'],
  AR: ['01-01', '03-24', '04-02', '05-01', '05-25', '06-20', '07-09', '12-08', '12-25'],
  BO: ['01-01', '01-22', '05-01', '06-21', '08-06', '11-02', '12-25'],
  BR: ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'],
  CL: ['01-01', '05-01', '05-21', '06-21', '07-16', '08-15', '09-18', '09-19', '10-31', '11-01', '12-08', '12-25'],
  EC: ['01-01', '05-01', '05-24', '08-10', '10-09', '11-02', '11-03', '12-25'],
  GY: ['01-01', '02-23', '05-01', '05-26', '08-01', '12-25', '12-26'],
  PY: ['01-01', '03-01', '05-01', '05-14', '05-15', '06-12', '08-15', '09-29', '12-08', '12-25'],
  PE: ['01-01', '05-01', '06-29', '07-28', '07-29', '08-30', '10-08', '11-01', '12-08', '12-25'],
  SR: ['01-01', '05-01', '07-01', '11-25', '12-25', '12-26'],
  UY: ['01-01', '05-01', '07-18', '08-25', '12-25'],
  VE: ['01-01', '04-19', '05-01', '06-24', '07-05', '07-24', '10-12', '12-25'],
  CA: ['01-01', '07-01', '11-11', '12-25', '12-26'],
  US: ['01-01', '07-04', '11-11', '12-25'],
  MX: ['01-01', '02-05', '03-21', '05-01', '09-16', '11-20', '12-25'],
  BZ: ['01-01', '01-15', '03-09', '05-01', '09-10', '09-21', '10-12', '11-19', '12-25', '12-26'],
  CR: ['01-01', '04-11', '05-01', '07-25', '08-02', '08-15', '09-15', '12-01', '12-25'],
  SV: ['01-01', '05-01', '06-17', '08-06', '09-15', '11-02', '12-25'],
  GT: ['01-01', '05-01', '06-30', '09-15', '10-20', '11-01', '12-25'],
  HN: ['01-01', '04-14', '05-01', '09-15', '10-03', '10-12', '10-21', '12-25'],
  NI: ['01-01', '05-01', '07-19', '09-14', '09-15', '12-08', '12-25'],
  PA: ['01-01', '01-09', '05-01', '11-03', '11-05', '11-10', '11-28', '12-08', '12-25'],
  DO: ['01-01', '01-21', '01-26', '02-27', '05-01', '08-16', '09-24', '11-06', '12-25'],
  CU: ['01-01', '05-01', '07-26', '10-10', '12-25'],
  HT: ['01-01', '01-02', '05-01', '05-18', '10-17', '11-18', '12-25'],
  JM: ['01-01', '05-23', '08-01', '08-06', '10-16', '12-25', '12-26'],
  TT: ['01-01', '03-30', '05-30', '06-19', '08-01', '08-31', '09-24', '12-25', '12-26'],
  BS: ['01-01', '07-10', '12-25', '12-26'],
  BB: ['01-01', '01-21', '04-28', '08-01', '11-30', '12-25', '12-26'],
  LC: ['01-01', '02-22', '12-13', '12-25', '12-26'],
  VC: ['01-01', '03-14', '10-27', '12-25', '12-26'],
  GD: ['01-01', '02-07', '12-25', '12-26'],
  AG: ['01-01', '11-01', '12-09', '12-25', '12-26'],
  DM: ['01-01', '11-03', '11-04', '12-25', '12-26'],
  KN: ['01-01', '09-19', '12-25', '12-26'],
};

const isHoliday = (date: Date, country: CountryCode, customHolidays: string[] = []): boolean => {
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const key = `${m}-${d}`;
  const iso = date.toISOString().split('T')[0];
  
  const isFixedHoliday = HOLIDAYS[country] ? HOLIDAYS[country].includes(key) : false;
  const isCustomHoliday = customHolidays.includes(iso);
  
  return isFixedHoliday || isCustomHoliday;
};

export const calculateTotalReturn = (principal: number, interestRate: number) => {
  return principal * (1 + interestRate / 100);
};

export const generateAmortizationTable = (
  principal: number,
  interestRate: number,
  numInstallments: number,
  frequency: Frequency,
  startDate: Date = new Date(),
  country: CountryCode = 'CO',
  customHolidays: string[] = []
): Installment[] => {
  const totalAmount = calculateTotalReturn(principal, interestRate);
  const installmentValue = totalAmount / numInstallments;
  
  const installments: Installment[] = [];
  let currentDate = new Date(startDate);
  
  for (let i = 1; i <= numInstallments; i++) {
    if (frequency === Frequency.DAILY) {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (frequency === Frequency.WEEKLY) {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (frequency === Frequency.BIWEEKLY) {
      currentDate.setDate(currentDate.getDate() + 15);
    } else if (frequency === Frequency.MONTHLY) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    if (frequency === Frequency.DAILY) {
      let validDate = false;
      while (!validDate) {
        const isSunday = currentDate.getDay() === 0;
        const isFestivo = isHoliday(currentDate, country, customHolidays);
        if (isSunday || isFestivo) {
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          validDate = true;
        }
      }
    }

    installments.push({
      number: i,
      amount: parseFloat(installmentValue.toFixed(2)),
      dueDate: currentDate.toISOString(),
      status: PaymentStatus.PENDING,
      paidAmount: 0
    });
  }
  return installments;
};

export const formatCurrency = (amount: number, settings?: AppSettings) => {
  const format = settings?.numberFormat || 'dot';
  const locale = format === 'comma' ? 'en-US' : 'de-DE';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD', // Usamos USD solo para el símbolo $, el locale controla los separadores
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('$', '$ ').replace('US$', '$');
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const dayName = date.toLocaleDateString('es-CO', { weekday: 'long' });
  const formattedDate = date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${formattedDate}`;
};

export const formatFullDateTime = (date: Date = new Date()) => {
  const dayName = date.toLocaleDateString('es-CO', { weekday: 'long' });
  const formattedDate = date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const time = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${formattedDate} ${time}`;
};

export const getDaysOverdue = (loan: Loan): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstUnpaid = loan.installments.find(i => i.status !== PaymentStatus.PAID && new Date(i.dueDate) < today);
  if (!firstUnpaid) return 0;
  return Math.ceil((today.getTime() - new Date(firstUnpaid.dueDate).getTime()) / (1000 * 60 * 60 * 24));
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

const receiptTranslations = {
  es: {
    header: 'RECIBO OFICIAL DE PAGO',
    renewalHeader: 'SOPORTE DE LIQUIDACIÓN / REINVERSIÓN',
    date: 'FECHA',
    ref: 'REF CRÉDITO',
    client: 'CLIENTE',
    paid: 'VALOR ABONADO',
    progress: 'PROGRESO DEL CRÉDITO',
    installments: 'CUOTAS',
    start: 'INICIO',
    end: 'VENCE',
    overdue: 'ATRASO',
    days: 'días',
    balance: 'SALDO PENDIENTE',
    footer: 'Este documento es un soporte válido de su transacción.\n¡Gracias por su puntualidad!',
    noPayHeader: 'NOTIFICACIÓN DE MORA',
    visitDate: 'VISITA REGISTRADA EL',
    status: 'ESTADO DE HOY',
    noPay: 'SIN ABONO REGISTRADO',
    situation: 'SITUACIÓN ACTUAL',
    pendingInst: 'CUOTAS PENDIENTES',
    daysLate: 'DÍAS EN ATRASO',
    totalBalance: 'SALDO TOTAL PENDIENTE',
    noPayFooter: 'Su compromiso de pago es vital para mantener su cupo de crédito activo.\n¡Favor ponerse al día pronto!'
  },
  en: {
    header: 'OFFICIAL PAYMENT RECEIPT',
    renewalHeader: 'LIQUIDATION / REINVESTMENT RECEIPT',
    date: 'DATE',
    ref: 'LOAN REF',
    client: 'CLIENT',
    paid: 'AMOUNT PAID',
    progress: 'LOAN PROGRESS',
    installments: 'INSTALLMENTS',
    start: 'START',
    end: 'DUE DATE',
    overdue: 'OVERDUE',
    days: 'days',
    balance: 'REMAINING BALANCE',
    footer: 'This document is a valid record of your transaction.\nThank you for your punctuality!',
    noPayHeader: 'DEFAULT NOTIFICATION',
    visitDate: 'VISIT RECORDED ON',
    status: 'STATUS TODAY',
    noPay: 'NO PAYMENT RECORDED',
    situation: 'CURRENT SITUATION',
    pendingInst: 'PENDING INSTALLMENTS',
    daysLate: 'DAYS OVERDUE',
    totalBalance: 'TOTAL BALANCE DUE',
    noPayFooter: 'Your payment commitment is vital to keep your credit line active.\nPlease catch up soon!'
  }
};

export const generateReceiptText = (data: ReceiptData, settings: AppSettings) => {
  const lang = settings.language || 'es';
  const dateFormatted = formatFullDateTime();
  const t = receiptTranslations[lang] || receiptTranslations.es;
  const headerText = data.isRenewal ? t.renewalHeader : t.header;
  const company = settings.companyName || 'ANEXO COBRO';
  const contact = settings.contactPhone ? `\nSOPORTE: ${settings.contactPhone}` : '';
  const alias = settings.transferAlias ? `\nALIAS TRANSF: ${settings.transferAlias}` : '';

  return `
===============================
       ${company.toUpperCase()}
    ${headerText}
===============================
${t.date}: ${dateFormatted}
${t.ref}: ${data.loanId.toUpperCase()}
-------------------------------
${t.client}: ${data.clientName.toUpperCase()}
-------------------------------
${t.paid}:
>>> ${formatCurrency(data.amountPaid, settings)} <<<
-------------------------------
${t.progress}:
${t.installments}: ${data.paidInstallments} / ${data.totalInstallments}
${t.start}: ${formatDate(data.startDate)}
${t.end}: ${formatDate(data.expiryDate)}
${t.overdue}: ${data.daysOverdue} ${t.days}
-------------------------------
${t.balance}:
>>> ${formatCurrency(data.remainingBalance, settings)} <<<
-------------------------------
${t.footer}${contact}${alias}
===============================
`;
};

export const generateNoPaymentReceiptText = (data: ReceiptData, settings: AppSettings) => {
  const lang = settings.language || 'es';
  const dateFormatted = formatFullDateTime();
  const t = receiptTranslations[lang] || receiptTranslations.es;
  const company = settings.companyName || 'ANEXO COBRO';
  const contact = settings.contactPhone ? `\nSOPORTE: ${settings.contactPhone}` : '';

  return `
===============================
       ${company.toUpperCase()}
   ${t.noPayHeader}
===============================
${t.visitDate}:
>>> ${dateFormatted} <<<
-------------------------------
${t.ref}: ${data.loanId.toUpperCase()}
${t.client}: ${data.clientName.toUpperCase()}
-------------------------------
${t.status}:
>>> ${t.noPay} <<<
-------------------------------
${t.situation}:
${t.pendingInst}: ${data.totalInstallments - data.paidInstallments}
${t.daysLate}: ${data.daysOverdue} ${t.days}
-------------------------------
${t.totalBalance}:
>>> ${formatCurrency(data.remainingBalance, settings)} <<<
-------------------------------
${t.noPayFooter}${contact}
===============================
`;
};

export const generateLoanStatementText = (loan: Loan, clientName: string, logs: CollectionLog[], settings: AppSettings) => {
  const totalPaid = loan.installments.reduce((acc, i) => acc + i.paidAmount, 0);
  const balance = loan.totalAmount - totalPaid;
  const lastDate = loan.installments[loan.installments.length - 1].dueDate;
  
  return `ESTADO DE CUENTA - ${clientName}\nSaldo: ${formatCurrency(balance, settings)}\nVence: ${formatDate(lastDate)}`;
};
