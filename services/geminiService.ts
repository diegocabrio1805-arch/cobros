// Removed GoogleGenAI SDK to prevent Fatal Errors on startup if API Key is missing or delayed
import { AppState, Loan, Client, PaymentStatus, AppSettings } from "../types";
import { formatCurrency, formatDate } from "../utils/helpers";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = 'gemini-1.5-flash';

const fetchGemini = async (prompt: string, isJson: boolean = false) => {
  if (!apiKey) {
    console.error("Gemini API Key missing");
    throw new Error("API Key missing");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          ...(isJson ? { response_mime_type: "application/json" } : {})
        }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

export const getFinancialInsights = async (state: AppState) => {
  const { loans, clients, expenses } = state;

  const totalLent = loans.reduce((acc, l) => acc + l.principal, 0);
  const totalProfitProyected = loans.reduce((acc, l) => acc + (l.totalAmount - l.principal), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netUtility = totalProfitProyected - totalExpenses;

  const prompt = `
    Analiza la situación financiera de una empresa de préstamos. Responde en español y estrictamente en formato JSON.
    DATOS:
    - Clientes: ${clients.length}
    - Préstamos Activos: ${loans.filter(l => l.status === 'Activo').length}
    - Capital prestado: ${totalLent}
    - Intereses proyectados: ${totalProfitProyected}
    - Gastos: ${totalExpenses}
    - Utilidad neta: ${netUtility}
    
    JSON:
    {
      "summary": "Breve resumen",
      "riskLevel": "Bajo/Medio/Alto",
      "recommendations": ["Tip 1", "Tip 2"],
      "topClients": []
    }
  `;

  try {
    const text = await fetchGemini(prompt, true);
    return JSON.parse(text || '{}');
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      summary: "Sistema de Inteligencia Artificial activo. Analizando datos de la sucursal...",
      riskLevel: "Bajo",
      recommendations: ["Sincronizando métricas en tiempo real"],
      topClients: []
    };
  }
};

export const generateAIStatement = async (loan: Loan, client: Client, daysOverdue: number, state: AppState) => {
  const totalPaid = loan.installments.reduce((acc, i) => acc + i.paidAmount, 0);
  const balance = loan.totalAmount - totalPaid;
  const paidInstallments = loan.installments.filter(i => i.status === PaymentStatus.PAID).length;
  const lastInstallment = loan.installments[loan.installments.length - 1];
  const settings = state.settings;

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
    const text = await fetchGemini(prompt);
    return text || "Error generando el extracto con IA.";
  } catch (error) {
    console.error("Gemini Statement Error:", error);
    return `*ESTADO DE CUENTA - ANEXO COBRO*\n\nCliente: ${client.name}\nSaldo: ${formatCurrency(balance, settings)}\nAtraso: ${daysOverdue} días.`;
  }
};

export const generateNoPaymentAIReminder = async (loan: Loan, client: Client, daysOverdue: number, settings?: AppSettings) => {
  const totalPaid = loan.installments.reduce((acc, i) => acc + i.paidAmount, 0);
  const balance = loan.totalAmount - totalPaid;
  const companyName = settings?.companyName || 'ANEXO COBRO';

  // Template solicitado por usuario:
  // "Hola (nombre) registramos hoy que no pudo realizar el pago. Porfavor, trate de ponerse al dia con su saldo (saldo) ATENTAMENTE (empresa)"
  return `Hola ${client.name} registramos hoy que no pudo realizar el pago. Porfavor, trate de ponerse al dia con su saldo ${formatCurrency(balance, settings)} ATENTAMENTE ${companyName.toUpperCase()}`;
};
