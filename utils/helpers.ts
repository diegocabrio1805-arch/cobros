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
  // Forzamos formato YYYY-MM-DD usando Intl de forma segura
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(now);
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  return `${year}-${month}-${day}`;
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
    'DO': 'Rep. Dominicana',
    'AR': 'Argentina', 'BO': 'Bolivia', 'BR': 'Brasil', 'CL': 'Chile', 'PE': 'Perú', 'UY': 'Uruguay', 'VE': 'Venezuela',
    'US': 'Estados Unidos', 'ES': 'España', 'BZ': 'Belice', 'GY': 'Guyana', 'SR': 'Surinam',
    'CU': 'Cuba', 'HT': 'Haití', 'JM': 'Jamaica', 'TT': 'Trinidad y Tobago', 'BS': 'Bahamas', 'BB': 'Barbados',
    'LC': 'Santa Lucía', 'VC': 'San Vicente', 'GD': 'Granada', 'AG': 'Antigua y Barbuda', 'DM': 'Dominica', 'KN': 'San Cristóbal y Nieves',
    'CA': 'Canadá'
  };
  return names[country] || 'Colombia';
};

export const isHoliday = (date: Date | null | undefined, country: string, customHolidays: string[] = []): boolean => {
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

  // Feriados Nacionales Paraguay (Formato aproximado 2025/2026)
  if (country === 'PY') {
    const fixedHolidays = [
      '01-01', '03-01', '04-17', '04-18', '05-01', '05-14', '05-15',
      '06-12', '08-15', '09-29', '12-08', '12-25'
    ];
    if (fixedHolidays.includes(`${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)) return true;
  }

  // Feriados personalizados
  if (customHolidays && customHolidays.includes(dateStr)) return true;

  return false;
};

export const formatCurrency = (value: number | undefined, settings: AppSettings | undefined): string => {
  if (value === undefined) return '$0';
  const currencySymbol = settings?.currencySymbol || '$';
  return `${currencySymbol}${Math.round(value).toLocaleString('es-CO')}`;
};

export const calculateTotalReturn = (amount: any, rate: any): number => {
  return Number(amount) * (1 + Number(rate) / 100);
};

export const generateAmortizationTable = (
  amount: any,
  rate: any,
  installments: any,
  frequency: Frequency,
  startDate: string | Date,
  country: string,
  customHolidays: string[] = []
) => {
  try {
    const numAmount = Number(amount);
    const numRate = Number(rate);
    const numInstallments = Number(installments);

    const totalAmount = calculateTotalReturn(numAmount, numRate);
    const installmentValue = Math.ceil(totalAmount / (numInstallments || 1));
    const table = [];

    // Asegurar que startDate sea un objeto Date a las 00:00:00
    let currentDate: Date;
    if (typeof startDate === "string") {
      // Handle DD/MM/YYYY or YYYY-MM-DD
      if (startDate.includes('/') && !startDate.includes('-')) {
        const parts = startDate.split(' ')[0].split('/');
        if (parts[0].length === 2) { // DD/MM/YYYY
          currentDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
        } else { // YYYY/MM/DD
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

    if (isNaN(currentDate.getTime())) {
      console.warn("Fecha inválida en amortización, usando hoy");
      currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
    }

    for (let i = 1; i <= numInstallments; i++) {
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

      // REGLA DE ORO: Saltar Domingos (getDay === 0) y Festivos
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
  } catch (error) {
    console.error("Error generando tabla amortización:", error);
    return [];
  }
};

export const getDaysOverdue = (loan: Loan, settings: AppSettings, customTotalPaid?: number): number => {
  try {
    if (!loan || !loan.createdAt) return 0;

    const todayStr = getLocalDateStringForCountry(settings?.country || 'CO');
    const today = new Date(todayStr + 'T00:00:00');

    const totalPaid = customTotalPaid !== undefined
      ? Number(customTotalPaid)
      : (loan.installments || []).reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);

    // SIEMPRE generar tabla virtual desde la fecha de creación real para el cálculo de mora.
    // Esto evita errores si el cronograma guardado en el objeto 'loan' tiene fechas futuras.
    const virtualInstallments = generateAmortizationTable(
      loan.principal,
      loan.interestRate,
      loan.totalInstallments,
      loan.frequency,
      loan.createdAt,
      settings?.country || 'CO',
      loan.customHolidays || []
    );

    if (!virtualInstallments || virtualInstallments.length === 0) return 0;

    // 1. Encontrar la primera cuota que no está totalmente pagada en la tabla virtual
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

    if (isNaN(firstDueDate.getTime()) || firstDueDate >= today) {
      return 0;
    }

    // 2. Contar DÍAS DE ATRASO (Excluyendo domingos y feriados sugeridos por el usuario)
    let delayedWorkingDays = 0;
    let tempDate = new Date(firstDueDate);

    // El atraso cuenta desde el día siguiente al vencimiento HASTA EL DÍA ANTERIOR A HOY
    // (Según ejemplo del usuario: si vence el 1 y es el 4, son 2 días de mora: el 2 y el 3)
    while (tempDate < today) {
      tempDate.setDate(tempDate.getDate() + 1);

      if (tempDate >= today) break; // NO contar el día de hoy ni días después

      const isSun = tempDate.getDay() === 0;
      const isHol = isHoliday(tempDate, settings?.country || 'CO', loan.customHolidays || []);

      if (!isSun && !isHol) {
        delayedWorkingDays++;
      }
    }

    return delayedWorkingDays;
  } catch (err) {
    console.error("Error calculando mora para prestamo:", loan?.id, err);
    return 0; // Fallback seguro
  }
};

export const calculateOverdueDays = (dueDate: string, country: string, loan: Loan): number => {
  const todayStr = getLocalDateStringForCountry(country);
  const today = new Date(todayStr + 'T00:00:00');
  const due = new Date(dueDate + 'T00:00:00');
  if (isNaN(due.getTime()) || today <= due) return 0;

  let diffDays = 0;
  let tempDate = new Date(due);
  while (tempDate < today) {
    tempDate.setDate(tempDate.getDate() + 1);
    if (tempDate >= today) break; // Excluir hoy
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
  previousBalance: number; // Nuevo
  loanId: string;
  startDate: string; // Nuevo
  expiryDate: string;
  daysOverdue: number;
  remainingBalance: number;
  paidInstallments: number;
  totalInstallments: number;
  isRenewal?: boolean;
}

export const generateReceiptText = (data: ReceiptData, settings: AppSettings) => {
  const format = (text: string, bold?: boolean, size?: 'normal' | 'medium' | 'large') => {
    let result = text;
    if (bold) result = `<B1>${result}<B0>`;
    if (size === 'large') result = `<GS1>${result}<GS0>`;
    if (size === 'medium') result = `<GS2>${result}<GS0>`;
    return result;
  };

  const company = format((settings.companyName || 'ANEXO COBRO').toUpperCase(), settings.companyNameBold, settings.companyNameSize);
  const alias = (settings.companyAlias || '---').toUpperCase();
  // Fix: TEL. PUBLICO should be contactPhone based on Settings UI
  const phone = format(settings.contactPhone || '---', settings.contactPhoneBold);
  const support = settings.technicalSupportPhone || '---';
  const idValue = format(settings.companyIdentifier || '---', settings.companyIdentifierBold);

  const bankLabel = format((settings.shareLabel || 'BANCO').toUpperCase(), settings.shareLabelBold, settings.shareLabelSize);
  const bankValue = format((settings.shareValue || '---').toUpperCase(), settings.shareValueBold, settings.shareValueSize);

  const currencySymbol = settings.currencySymbol || '$';

  return `
===============================
${company}
===============================
MARCA: ${alias}
TEL. PUBLICO: ${phone}
ID EMPRESA: ${idValue}
${bankLabel}: ${bankValue}
VER: AGENT-FIX
===============================
FECHA: ${formatFullDateTime(settings.country)}
CLIENTE: ${data.clientName.toUpperCase()}
===============================
SALDO ANT: ${currencySymbol}${data.previousBalance.toLocaleString('es-CO')}
ABONO: ${currencySymbol}${data.amountPaid.toLocaleString('es-CO')}
SALDO ACT: ${currencySymbol}${data.remainingBalance.toLocaleString('es-CO')}
===============================
INICIO: ${formatDate(data.startDate)}
VENCE: ${formatDate(data.expiryDate)}
CUOTAS: ${data.paidInstallments} / ${data.totalInstallments}
MORA: ${data.daysOverdue} dias
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
  const cleanDate = dateString.split('T')[0];
  const date = new Date(cleanDate + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
