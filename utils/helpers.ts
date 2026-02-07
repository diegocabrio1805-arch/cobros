
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

  const safeCustomHolidays = Array.isArray(customHolidays) ? customHolidays : [];

  const isFixedHoliday = HOLIDAYS[country] ? HOLIDAYS[country].includes(key) : false;
  const isCustomHoliday = safeCustomHolidays.includes(iso);

  return isFixedHoliday || isCustomHoliday;
};

export const calculateTotalReturn = (principal: number, interestRate: number) => {
  return parseFloat((principal * (1 + interestRate / 100)).toFixed(2));
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
  let sumOfInstallments = 0;

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

    // Saltar domingos y festivos independientemente de la frecuencia
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

    let currentAmount = parseFloat(installmentValue.toFixed(2));
    if (i === numInstallments) {
      // Ajuste de la última cuota para que el total sea exacto
      currentAmount = parseFloat((totalAmount - sumOfInstallments).toFixed(2));
    }
    sumOfInstallments += currentAmount;

    installments.push({
      number: i,
      amount: currentAmount,
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

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Remover el símbolo $ del inicio y ponerlo al final con espacio
  return formatted.replace(/^\$\s?/, '').replace(/US\$\s?/, '') + ' $';
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

export const getDaysOverdue = (loan: Loan, settings: AppSettings, manualTotalPaid?: number): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const installments = loan.installments || [];
  if (installments.length === 0) return 0;

  const country = settings.country || 'CO';

  // Calculamos el total pagado históricamente (cuotas pagadas + abonos parciales)
  // Usamos el valor manual suministrado (generalmente calculado desde logs) o el de las cuotas
  const totalPaid = manualTotalPaid !== undefined
    ? manualTotalPaid
    : installments.reduce((acc, inst) => acc + (inst.paidAmount || 0), 0);

  // Determinamos cuántas cuotas completas se han cubierto con ese dinero
  const installmentValue = loan.installmentValue || (loan.totalAmount / loan.totalInstallments);

  // Buscamos la primera cuota que NO ha sido cubierta por el dinero total entregado
  let sumCovered = 0;
  let firstUncoveredInstallment = null;

  for (const inst of installments) {
    if (sumCovered + inst.amount > totalPaid + 0.01) { // Pequeño margen para errores de redondeo
      firstUncoveredInstallment = inst;
      break;
    }
    sumCovered += inst.amount;
  }

  // Si no hay cuotas sin cubrir, o la cuota sin cubrir vence en el futuro, no hay atraso
  if (!firstUncoveredInstallment) return 0;

  const dueDate = new Date(firstUncoveredInstallment.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate >= today) return 0;

  // Si la cuota venció, contamos los días de atraso saltando domingos y festivos
  let diffDays = 0;
  let tempDate = new Date(dueDate);

  while (tempDate < today) {
    tempDate.setDate(tempDate.getDate() + 1);
    // getDay() === 0 es Domingo
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
  const companyId = settings.companyIdentifier ? `\nNIT/RUC: ${settings.companyIdentifier}` : '';
  const contact = settings.contactPhone ? `\nSOPORTE: ${settings.contactPhone}` : '';
  const alias = settings.transferAlias ? `\nALIAS TRANSF: ${settings.transferAlias}` : '';

  const phoneFmt = settings.contactPhoneBold ? '<B1>' : '';
  const phoneEnd = settings.contactPhoneBold ? '<B0>' : '';

  const getSizTag = (size?: 'normal' | 'medium' | 'large') => {
    if (size === 'large') return '<GS1>';
    if (size === 'medium') return '<GS2>';
    return '<GS0>';
  };
  const getSizEnd = (size?: 'normal' | 'medium' | 'large') => {
    if (size === 'large' || size === 'medium') return '<GS0>';
    return '';
  };

  const shareLabelFmt = (settings.shareLabelBold ? '<B1>' : '') + getSizTag(settings.shareLabelSize);
  const shareLabelEnd = getSizEnd(settings.shareLabelSize) + (settings.shareLabelBold ? '<B0>' : '');
  const shareValueFmt = (settings.shareValueBold ? '<B1>' : '') + getSizTag(settings.shareValueSize);
  const shareValueEnd = getSizEnd(settings.shareValueSize) + (settings.shareValueBold ? '<B0>' : '');

  const shareSection = (settings.shareLabel && settings.shareValue)
    ? `\n-------------------------------\n${shareLabelFmt}${settings.shareLabel.toUpperCase()}${shareLabelEnd}:\n>>> ${shareValueFmt}${settings.shareValue}${shareValueEnd} <<<`
    : '';

  const margin = settings.receiptPrintMargin ?? 2;
  const marginLines = "\n".repeat(margin);

  const nameFmt = (settings.companyNameBold ? '<B1>' : '') + getSizTag(settings.companyNameSize);
  const nameEnd = getSizEnd(settings.companyNameSize) + (settings.companyNameBold ? '<B0>' : '');

  const idFmt = settings.companyIdentifierBold ? '<B1>' : '';
  const idEnd = settings.companyIdentifierBold ? '<B0>' : '';

  return `
===============================
       ${nameFmt}${company.toUpperCase()}${nameEnd}
    ${headerText}${idFmt}${companyId}${idEnd}
===============================
${t.date}: ${dateFormatted}
${t.ref}: ${data.loanId.toUpperCase()}
-------------------------------
${t.client}: ${data.clientName.toUpperCase()}
-------------------------------${shareSection}
${t.paid}:
>>> <GS2>${formatCurrency(data.amountPaid, settings)}<GS0> <<<
-------------------------------
${t.progress}:
${t.installments}: ${data.paidInstallments} / ${data.totalInstallments}
${t.start}: ${formatDate(data.startDate)}
${t.end}: ${formatDate(data.expiryDate)}
${t.overdue}: ${data.daysOverdue} ${t.days}
-------------------------------
${t.balance}:
>>> <GS2>${formatCurrency(data.remainingBalance, settings)}<GS0> <<<
-------------------------------
${t.footer}${phoneFmt}${contact}${phoneEnd}${alias}
===============================
${marginLines}
`;
}

  ;

// Convierte el recibo con etiquetas de impresora a formato WhatsApp con Markdown
export const convertReceiptForWhatsApp = (receiptText: string): string => {
  return receiptText
    // Remover todas las etiquetas de control de impresora
    .replace(/<GS[012]>/g, '')
    .replace(/<B[01]>/g, '')
    // No se aplica negrita, solo se remueven las etiquetas de impresora
    ;
};

export const generateNoPaymentReceiptText = (data: ReceiptData, settings: AppSettings) => {
  const lang = settings.language || 'es';
  const dateFormatted = formatFullDateTime();
  const t = receiptTranslations[lang] || receiptTranslations.es;
  const company = settings.companyName || 'ANEXO COBRO';
  const companyId = settings.companyIdentifier ? `\nNIT/RUC: ${settings.companyIdentifier}` : '';
  const contact = settings.contactPhone ? `\nSOPORTE: ${settings.contactPhone}` : '';

  const margin = settings.receiptPrintMargin ?? 2;
  const marginLines = "\n".repeat(margin);

  const nameFmt = (settings.companyNameBold ? '<B1>' : '') + (settings.companyNameSize === 'large' ? '<GS1>' : '');
  const nameEnd = (settings.companyNameSize === 'large' ? '<GS0>' : '') + (settings.companyNameBold ? '<B0>' : '');

  const idFmt = settings.companyIdentifierBold ? '<B1>' : '';
  const idEnd = settings.companyIdentifierBold ? '<B0>' : '';

  const phoneFmt = settings.contactPhoneBold ? '<B1>' : '';
  const phoneEnd = settings.contactPhoneBold ? '<B0>' : '';

  return `
===============================
       ${nameFmt}${company.toUpperCase()}${nameEnd}
   ${t.noPayHeader}${idFmt}${companyId}${idEnd}
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
${t.noPayFooter}${phoneFmt}${contact}${phoneEnd}
===============================
${marginLines}
`;
};

export const generateLoanStatementText = (loan: Loan, clientName: string, logs: CollectionLog[], settings: AppSettings) => {
  const installments = loan.installments || [];
  const totalPaid = installments.reduce((acc, i) => acc + i.paidAmount, 0);
  const balance = loan.totalAmount - totalPaid;
  const lastDate = installments.length > 0 ? installments[installments.length - 1].dueDate : new Date().toISOString();

  return `ESTADO DE CUENTA - ${clientName}\nSaldo: ${formatCurrency(balance, settings)}\nVence: ${formatDate(lastDate)}`;
};

import { v4 as uuidv4 } from 'uuid';

export const generateUUID = (): string => {
  return uuidv4();
};
