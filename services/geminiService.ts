
import { GoogleGenAI, Type } from "@google/genai";
// Added AppSettings to the import from ../types
import { AppState, Loan, Client, PaymentStatus, AppSettings } from "../types";
import { formatCurrency, formatDate } from "../utils/helpers";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const validApiKey = (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') ? apiKey : 'AIzaSyCNe0T1_TGwZUBz_nhil_4tDPQxcl-JzIg';

const ai = new GoogleGenAI({ apiKey: validApiKey });

export const getFinancialInsights = async (state: AppState) => {
  // Check is removed since we have a hardcoded fallback
  // if (!import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_API_KEY) {
  //   return null;
  // }
  const { loans, clients, payments, expenses, settings } = state;

  const totalLent = loans.reduce((acc, l) => acc + l.principal, 0);
  const totalProfitProyected = loans.reduce((acc, l) => acc + (l.totalAmount - l.principal), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netUtility = totalProfitProyected - totalExpenses;

  const prompt = `
    Analiza la siguiente situación financiera de una empresa de préstamos:
    Datos actuales (Formato numérico preferido: ${settings.numberFormat === 'comma' ? '1,000,000.00' : '1.000.000,00'}):
    - Clientes totales: ${clients.length}
    - Préstamos activos: ${loans.filter(l => l.status === 'Activo').length}
    - Capital total prestado: ${formatCurrency(totalLent, settings)}
    - Intereses proyectados (Ingresos): ${formatCurrency(totalProfitProyected, settings)}
    - Gastos operativos registrados: ${formatCurrency(totalExpenses, settings)}
    - Utilidad neta proyectada: ${formatCurrency(netUtility, settings)}
    - Recaudado hoy: ${formatCurrency(payments.filter(p => new Date(p.date).toDateString() === new Date().toDateString()).reduce((acc, p) => acc + p.amount, 0), settings)}
    
    Por favor responde en formato JSON con la siguiente estructura:
    {
      "summary": "Resumen ejecutivo del estado de la empresa considerando ingresos vs gastos",
      "riskLevel": "Bajo/Medio/Alto",
      "recommendations": ["Recomendación para mejorar la utilidad o reducir gastos", "Recomendación operativa"],
      "topClients": ["Nombre de cliente con mejor comportamiento"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            riskLevel: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            topClients: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return null;
  }
};

export const generateAIStatement = async (loan: Loan, client: Client, daysOverdue: number, state: AppState) => {
  const totalPaid = loan.installments.reduce((acc, i) => acc + i.paidAmount, 0);
  const balance = loan.totalAmount - totalPaid;
  const paidInstallments = loan.installments.filter(i => i.status === PaymentStatus.PAID).length;
  const lastInstallment = loan.installments[loan.installments.length - 1];
  const settings = state.settings;

  // API Key check removed - using hardcoded fallback
  // if (!import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_API_KEY) {
  //   return `*ESTADO DE CUENTA - ANEXO COBRO*\n\nCliente: ${client.name}\nSaldo: ${formatCurrency(balance, settings)}\nAtraso: ${daysOverdue} días.`;
  // }

  const prompt = `
    Eres un asistente profesional de una Fintech llamada "ANEXO COBRO". 
    Debes redactar un extracto de cuenta profesional y persuasivo para enviar por WhatsApp al cliente.
    Usa el formato numérico: ${settings.numberFormat === 'comma' ? '1,000,000.00' : '1.000.000,00'}.
    
    DATOS DEL CLIENTE:
    - Nombre: ${client.name}
    - Monto Prestado Inicial: ${formatCurrency(loan.principal, settings)}
    - Total con Intereses: ${formatCurrency(loan.totalAmount, settings)}
    - Saldo Pendiente Actual: ${formatCurrency(balance, settings)}
    - Cuotas Pagadas: ${paidInstallments} de ${loan.totalInstallments}
    - Próximo Vencimiento Final: ${formatDate(lastInstallment.dueDate)}
    - Días de Atraso Actuales: ${daysOverdue} días
    
    INSTRUCCIONES:
    - Usa emojis de forma profesional.
    - Sé muy claro con los números.
    - Si tiene atraso, sé firme pero respetuoso invitando al pago.
    - Si está al día, agradécele su puntualidad.
    - El mensaje debe parecer una tarjeta profesional en texto.
    
    RESPONDE SOLAMENTE CON EL TEXTO DEL MENSAJE.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95
      }
    });

    return response.text || "Error generando el extracto con IA.";
  } catch (error) {
    console.error("Gemini Statement Error:", error);
    return `*ESTADO DE CUENTA - ANEXO COBRO*\n\nCliente: ${client.name}\nSaldo: ${formatCurrency(balance, settings)}\nAtraso: ${daysOverdue} días.`;
  }
};

export const generateNoPaymentAIReminder = async (loan: Loan, client: Client, daysOverdue: number, settings?: AppSettings) => {
  const totalPaid = loan.installments.reduce((acc, i) => acc + i.paidAmount, 0);
  const balance = loan.totalAmount - totalPaid;

  // API Key check removed - using hardcoded fallback
  // if (!import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_API_KEY) {
  //   return `Hola ${client.name}, registramos que hoy no se pudo realizar su abono. Por favor, trate de ponerse al día con su saldo de ${formatCurrency(balance, settings)}. Atentamente, ANEXO COBRO.`;
  // }

  const prompt = `
    Eres el asistente de cobranza de "ANEXO COBRO". Un cobrador acaba de visitar al cliente ${client.name} y NO se registró un pago hoy.
    Usa el formato numérico: ${settings?.numberFormat === 'comma' ? '1,000,000.00' : '1.000.000,00'}.
    
    Debes redactar un mensaje de WhatsApp MUY EDUCADO, amable pero profesional.
    Pídele por favor que intente realizar su abono lo antes posible para evitar recargos o afectar su historial.
    
    DATOS PARA INCLUIR:
    - Saldo pendiente actual: ${formatCurrency(balance, settings)}
    - Días de atraso registrados: ${daysOverdue} días
    
    INSTRUCCIONES:
    - Usa un tono empático ("entendemos que pueden surgir inconvenientes").
    - Pide "por favor" que abone.
    - Resalta la importancia de estar al día.
    - Firma como: Equipo de Gestión - ANEXO COBRO.
    
    RESPONDE SOLAMENTE CON EL TEXTO DEL MENSAJE.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        temperature: 0.8
      }
    });

    return response.text || "Mensaje de recordatorio no disponible.";
  } catch (error) {
    console.error("No Payment AI Error:", error);
    return `Hola ${client.name}, registramos que hoy no se pudo realizar su abono. Por favor, trate de ponerse al día con su saldo de ${formatCurrency(balance, settings)}. Atentamente, ANEXO COBRO.`;
  }
};
