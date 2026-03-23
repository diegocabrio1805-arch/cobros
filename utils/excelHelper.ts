import * as XLSX from 'xlsx-js-style';
import { Client, Loan, Frequency, LoanStatus, PaymentStatus, CollectionLog, CollectionLogType } from '../types';
import { parseAmount, formatDate, generateUUID, generateAmortizationTable } from './helpers';
import { mapHeadersWithAI } from '../services/geminiService';

/**
 * Robustly parses dates from Excel, handling both serial numbers and strings.
 */
const parseExcelDate = (val: any): string => {
    const todayStr = new Date().toISOString();
    if (!val) return todayStr;

    // Si es un número o string compuesto solo de números (Excel Serial Date)
    if (typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(val.trim()))) {
        const numVal = Number(val);
        // Validar rango lógico para fechas de Excel (entre año 2000 y 2050 aprox)
        if (numVal > 35000 && numVal < 60000) {
            const date = new Date((numVal - 25569) * 86400 * 1000);
            return date.toISOString();
        }
    }

    const str = String(val).trim();
    if (!str) return todayStr;

    // Intentar DD/MM/YYYY
    if (str.includes('/')) {
        const parts = str.split(' ')[0].split('/');
        if (parts.length === 3) {
            // Asumimos DD-MM-YYYY
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) return d.toISOString();
        }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
            return d.toISOString();
        }
    }
    return todayStr;
};

export const EXCEL_COLUMNS = [
    "Op. Nº", "Nombre / Razon Social", "Import. Pagare", "Monto cobrado", "Saldo", 
    "Fec. Des.", "vto pagare", "Val. Cuota", "Ctas. Pend", "Ctas. Tot", "Cta. Pag", 
    "Prox Vto.", "Atraso", "Fecha ultimo", "Localidad", "Celular", "Calif.", 
    "Cod. Vend.", "Producto", "Banca"
];

export const exportClientsToExcel = (clients: Client[], loans: Loan[]) => {
    const data = clients.map(client => {
        const loan = loans.find(l => l.clientId === client.id && l.status !== LoanStatus.PAID) ||
            loans.filter(l => l.clientId === client.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        const paidInstallments = loan?.installments.filter(i => i.status === PaymentStatus.PAID).length || 0;
        const pendingInstallments = (loan?.totalInstallments || 0) - paidInstallments;
        const totalPaid = loan?.installments.reduce((acc, i) => acc + i.paidAmount, 0) || 0;

        return {
            "Op. Nº": client.externalId || client.id,
            "Nombre / Razon Social": client.name,
            "Import. Pagare": loan?.totalAmount || 0,
            "Monto cobrado": totalPaid,
            "Saldo": client.currentBalance || loan?.balance || 0,
            "Fec. Des.": loan?.createdAt ? formatDate(loan.createdAt) : "A COMPLETAR",
            "vto pagare": loan?.promissoryNoteExpiration ? formatDate(loan.promissoryNoteExpiration) : "A COMPLETAR",
            "Val. Cuota": loan?.installmentValue || 0,
            "Ctas. Pend": pendingInstallments,
            "Ctas. Tot": loan?.totalInstallments || 0,
            "Cta. Pag": paidInstallments,
            "Prox Vto.": "N/A",
            "Atraso": 0,
            "Fecha ultimo": "N/A",
            "Localidad": client.address,
            "Celular": client.phone,
            "Calif.": client.systemRating || "N/A",
            "Cod. Vend.": loan?.sellerCode || client.sellerCode || "N/A",
            "Producto": loan?.operationTypeCode || "202",
            "Banca": client.clientTypeCode || "131"
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");

    // Estilos básicos para el encabezado
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
            fill: { fgColor: { rgb: "10B981" } }, // Emerald 500
            font: { color: { rgb: "FFFFFF" }, bold: true },
            alignment: { horizontal: "center" }
        };
    }

    XLSX.writeFile(wb, `CARTERA_CLIENTES_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export interface ImportError {
    row: number;
    clientName?: string;
    reason: string;
}

export const processExcelImport = (file: File, collectorId: string, branchId: string, sellerCode: string, country: string = 'CO'): Promise<{ 
    clients: Client[], 
    loans: Loan[], 
    logs: CollectionLog[],
    discoveryMeta: Record<string, string>,
    errors: ImportError[]
}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                let rows: any[][] = [];

                if (file.name.toLowerCase().endsWith('.json')) {
                    const text = new TextDecoder().decode(data);
                    const jsonObj = JSON.parse(text);
                    if (Array.isArray(jsonObj) && jsonObj.length > 0) {
                        const headers = Object.keys(jsonObj[0]);
                        rows.push(headers);
                        jsonObj.forEach(obj => {
                            // Extrae los valores y los sanitiza (string empty en lugar de null/undefined)
                            rows.push(headers.map(h => {
                                const val = obj[h];
                                return val === null || val === undefined ? '' : String(val);
                            }));
                        });
                    }
                } else {
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                    // Sanitización estándar
                    rows = rawRows.map(r => (r || []).map(cell => cell === null || cell === undefined ? '' : String(cell)));
                }

                if (rows.length === 0) {
                    resolve({ clients: [], loans: [], logs: [], discoveryMeta: {}, errors: [] });
                    return;
                }

                let clientHeaderRow = -1;
                let loanHeaderRow = -1;
                let maxClientScore = 0;
                let maxLoanScore = 0;

                const normalizeHeader = (s: string) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").trim();

                const STRICT_KEYWORDS = [
                    "NOMBRECOMPLETO", "DOCUMENTO", "MONTO", "VALORCUOTA", "TOTALAPAGAR", "SALDOPENDIENTE", // Plantilla Actual
                    "DOCID", "PRINCIPAL", "TOTALAMT", "INSTVALUE", "BALANCE", "ID", "RAZONSOCIAL", // JSON / Bot Viejo
                    "OPN", "NOMBRERAZONSOCIAL", "IMPORTPAGARE", "MONTOCOBRADO", "SALDO", "FECDES", "CTASPEND", "CTASTOT", "CTAPAG", "LOCALIDAD", "CELULAR" // Cartera nativa
                ];
                
                // 1. Detect Header Row
                for (let i = 0; i < Math.min(rows.length, 20); i++) {
                    const row = (rows[i] || []).map(cell => normalizeHeader(cell));
                    let matches = 0;
                    row.forEach(cell => {
                        if (STRICT_KEYWORDS.some(k => cell.includes(k))) matches++;
                    });

                    if (matches >= 3) {
                        clientHeaderRow = i;
                        break;
                    }
                }

                if (clientHeaderRow === -1) {
                    reject(new Error("No se detectó el formato de la Plantilla Oficial. Por favor use el botón de 'Descargar Plantilla' para su archivo."));
                    return;
                }

                const getColMap = (headerRowIndex: number) => {
                    const map: Record<string, number> = {};
                    (rows[headerRowIndex] || []).forEach((val, idx) => {
                        const key = normalizeHeader(String(val || ''));
                        if (key) map[key] = idx;
                    });
                    return map;
                };

                const colMap = getColMap(clientHeaderRow);

                const findCol = (synonyms: string[]) => {
                    const normSyns = synonyms.map(s => normalizeHeader(s));
                    for (const sNorm of normSyns) {
                        if (colMap[sNorm] !== undefined) return colMap[sNorm];
                        // Partial match
                        const partial = Object.keys(colMap).find(k => k.includes(sNorm));
                        if (partial !== undefined) return colMap[partial];
                    }
                    return undefined;
                };

                const idxs = {
                    name: findCol(["NOMBRE COMPLETO", "NOMBRE", "CLIENTE", "RAZON SOCIAL", "TITULAR", "NAME", "NOMBRE", "NOMBRERAZONSOCIAL", "NOMBRE / RAZON SOCIAL"]),
                    docId: findCol(["DOCUMENTO", "CEDULA", "DNI", "DOCID", "OPN", "OP. Nº"]),
                    phone: findCol(["TELEFONO", "CELULAR", "PHONE"]),
                    addr: findCol(["DIRECCION", "DOMICILIO", "ADDR", "LOCALIDAD"]),
                    principal: findCol(["MONTO PRESTADO", "CAPITAL", "MONTO", "PRINCIPAL"]),
                    totalAmt: findCol(["TOTAL A PAGAR", "TOTAL RETORNO", "MONTO TOTAL", "TOTALAMT", "PAGARE", "IMPORT. PAGARE", "IMPORTPAGARE"]),
                    instValue: findCol(["VALOR CUOTA", "CUOTA", "INSTVALUE", "VAL. CUOTA", "VALCUOTA"]),
                    totalInst: findCol(["CUOTAS TOTALES", "PLAZO", "TOTALINST", "CTAS. TOT", "CTASTOT"]),
                    paidInst: findCol(["CUOTAS PAGADAS", "PAGADAS", "PAIDINST", "CTA. PAG", "CTAPAG"]),
                    balance: findCol(["SALDO PENDIENTE", "SALDO ACTUAL", "SALDO", "BALANCE"]),
                    date: findCol(["FECHA INICIO", "FECHA", "DATE", "FEC. DES", "FECDES"])
                };

                const discoveryMeta: Record<string, string> = {};

                const clients: Client[] = [];
                const loans: Loan[] = [];
                const logs: CollectionLog[] = [];
                const errors: ImportError[] = [];

                let consecutiveEmpty = 0;
                for (let i = clientHeaderRow + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0 || (row.length === 1 && !row[0])) {
                        consecutiveEmpty++;
                        if (consecutiveEmpty > 10) break;
                        continue;
                    }

                    let name = String(row[idxs.name ?? -1] || '').trim();
                    // Sanitizar nombres con espacios extra en comas (ej: "GOMEZ , JACINTO")
                    name = name.replace(/\s+,\s+/g, ', ').replace(/\s+,/g, ',').replace(/,\s+/g, ', ');
                    if (!name || name.toUpperCase().includes("TOTAL")) {
                        if (name.toUpperCase().includes("TOTAL")) {
                             // Probablemente fila de resumen, ignorar sin error ruidoso
                             consecutiveEmpty++;
                        } else {
                             errors.push({ row: i + 1, reason: "Nombre de cliente vacío o no encontrado en la columna esperada." });
                             consecutiveEmpty++;
                        }
                        if (consecutiveEmpty > 10) break;
                        continue;
                    }
                    consecutiveEmpty = 0;

                    const clientId = generateUUID();
                    let principal = Math.round(parseAmount(row[idxs.principal ?? -1]));
                    let totalAmount = Math.round(parseAmount(row[idxs.totalAmt ?? -1]));
                    let instValue = Math.round(parseAmount(row[idxs.instValue ?? -1]));
                    let totalInst = Math.round(parseAmount(row[idxs.totalInst ?? -1]));
                    let paidInst = Math.round(parseAmount(row[idxs.paidInst ?? -1]));
                    let pendInst = Math.max(0, totalInst - paidInst);
                    let balance = Math.round(parseAmount(row[idxs.balance ?? -1]));

                    if (name.includes("GOMEZ") || name.includes("JACINTO") || name.includes("MILNER") || name.includes("CHAPARRO")) {
                        console.log(`[FORENSIC] Analizando fila: ${name}`, {
                            rawTotal: row[idxs.totalAmt ?? -1],
                            rawBalance: row[idxs.balance ?? -1],
                            parsedTotal: totalAmount,
                            parsedBalance: balance,
                            rawPrincipal: row[idxs.principal ?? -1]
                        });
                    }

                    // MATH FORENSICS - PRIORIDAD AL DATO PAG
                    if (totalInst === 0) totalInst = paidInst + pendInst;
                    
                    // Cálculo de lo ya pagado basado en PAG y VALOR CUOTA
                    const totalPaidFromPag = paidInst * instValue;
                    const excelBalance = Math.round(parseAmount(row[idxs.balance ?? -1]));
                    
                    if (totalAmount === 0 && instValue > 0 && totalInst > 0) totalAmount = instValue * totalInst;
                    
                    // El saldo es lo que falta (Monto Total - Lo ya pagado)
                    const rawBalanceStr = String(row[idxs.balance ?? -1] || '').trim();
                    const hasExplicitBalance = rawBalanceStr !== '' && rawBalanceStr !== '-';

                    if (totalPaidFromPag > 0 || paidInst > 0) {
                        balance = Math.max(0, totalAmount - totalPaidFromPag);
                        // SAFETY NET: Si el cálculo dice 0 pero el Excel dice que hay saldo, confiamos en el Excel
                        if (balance === 0 && excelBalance > 0 && totalAmount === totalPaidFromPag) {
                             balance = excelBalance;
                             totalAmount = totalPaidFromPag + excelBalance;
                        }
                    } else if (balance === 0 && pendInst > 0 && instValue > 0) {
                        balance = pendInst * instValue;
                    } else if (hasExplicitBalance) {
                        balance = excelBalance;
                    } else {
                        // Si no hay información de pagos ni info explícita de saldo en "0", 
                        // asumimos que es un crédito activo con saldo COMPLETO. 
                        // (Evita que saldo=0 dispare un auto-pago total)
                        balance = totalAmount;
                    }

                    if (instValue === 0 && totalAmount > 0 && totalInst > 0) instValue = Math.round(totalAmount / totalInst);
                    if (principal === 0 && totalAmount > 0) principal = Math.round(totalAmount / 1.15); 

                    // AUDITORÍA MATEMÁTICA Y SEMÁFORO
                    let isRowValid = true;
                    if (totalAmount <= 0) {
                        errors.push({ row: i + 1, clientName: name, reason: "Monto total inválido o en cero." });
                        isRowValid = false;
                    } else if (instValue <= 0) {
                        errors.push({ row: i + 1, clientName: name, reason: "El valor de la cuota está en cero." });
                        isRowValid = false;
                    } else if (balance < 0 || balance > totalAmount) {
                        errors.push({ row: i + 1, clientName: name, reason: `Saldo inválido (Mayor al total o -).` });
                        isRowValid = false;
                    } else if (Number.isNaN(balance) || Number.isNaN(totalAmount)) {
                        errors.push({ row: i + 1, clientName: name, reason: "Contiene valores de texto donde van números." });
                        isRowValid = false;
                    }

                    clients.push({
                        id: clientId,
                        name,
                        documentId: String(row[idxs.docId ?? -1] || '---'),
                        phone: String(row[idxs.phone ?? -1] || '---'),
                        address: String(row[idxs.addr ?? -1] || '---'),
                        addedBy: collectorId,
                        branchId: branchId,
                        sellerCode: sellerCode,
                        clientTypeCode: "131",
                        creditLimit: 0,
                        isActive: true,
                        capital: principal,
                        currentBalance: balance,
                        createdAt: new Date().toISOString()
                    });

                    const loanId = `L-${clientId}`;
                    const loanInitialPaid = Math.round(totalPaidFromPag || Math.max(0, totalAmount - balance));

                    // CALCULAR TASA DE INTERÉS VIRTUAL PARA QUE LA TABLA COINCIDA CON EL MONTO TOTAL
                    const virtualInterestRate = principal > 0 ? ((totalAmount / principal) - 1) * 100 : 0;
                    const loanDate = parseExcelDate(row[idxs.date ?? -1]);

                    const installmentsTable = generateAmortizationTable(
                        principal,
                        virtualInterestRate,
                        totalInst || 24,
                        Frequency.DAILY,
                        loanDate,
                        country,
                        []
                    );

                    // MARCAR CUOTAS COMO PAGADAS SEGÚN EL DATO "PAG"
                    for (let j = 0; j < Math.min(paidInst, installmentsTable.length); j++) {
                        installmentsTable[j].status = PaymentStatus.PAID;
                        installmentsTable[j].paidAmount = Math.round(installmentsTable[j].amount);
                    }

                    loans.push({
                        id: loanId,
                        clientId,
                        collectorId,
                        branchId,
                        principal: Math.round(principal),
                        interestRate: virtualInterestRate,
                        totalInstallments: Math.round(totalInst || 24),
                        frequency: Frequency.DAILY, 
                        totalAmount: Math.round(totalAmount),
                        installmentValue: Math.round(instValue),
                        status: balance <= 0 ? LoanStatus.PAID : LoanStatus.ACTIVE,
                        createdAt: loanDate,
                        installments: installmentsTable,
                        sellerCode: sellerCode,
                        totalPaid: Math.round(loanInitialPaid),
                        balance: Math.round(balance)
                    });

                    // GENERAR LOG DE MIGRACIÓN PARA QUE SE REFLEJEN LAS CUOTAS PAGADAS
                    if (loanInitialPaid > 0) {
                        logs.push({
                            id: `LOG-MIG-${loanId}`,
                            loanId: loanId,
                            clientId: clientId,
                            collectorId: collectorId,
                            branchId: branchId,
                            amount: Math.round(loanInitialPaid),
                            type: CollectionLogType.PAYMENT,
                            date: loanDate,
                            location: { lat: 0, lng: 0 }, // LOCATION ES REQUERIDA POR LA INTERFAZ
                            notes: "MIGRACIÓN EXCEL - SALDO INICIAL",
                            isOpening: false,
                            recordedBy: collectorId,
                            updated_at: new Date().toISOString()
                        });
                    }
                }

                resolve({ clients, loans, logs, discoveryMeta, errors });
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

export const downloadExcelTemplate = () => {
    const headers = [
        "DOCUMENTO", "NOMBRE COMPLETO", "TELEFONO", "DIRECCION", 
        "MONTO PRESTADO", "VALOR CUOTA", "TOTAL A PAGAR", 
        "SALDO PENDIENTE", "CUOTAS TOTALES", "CUOTAS PAGADAS", 
        "FECHA INICIO", "VENDEDOR"
    ];
    
    // Plantilla de ejemplo con matemática correcta
    const exampleData = [
        [
            "1234567", "JUAN PEREZ", "0981123456", "CALLE FALSA 123", 
            2000000, 100000, 2400000,
            1200000, 24, 12,
            "13/03/2026", "VEND-01"
        ]
    ];

    const data = [headers, ...exampleData];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Importacion");

    // Estilos basicos para la cabecera
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!worksheet[address]) continue;
        worksheet[address].s = {
            fill: { fgColor: { rgb: "0F172A" } },
            font: { color: { rgb: "FFFFFF" }, bold: true },
            alignment: { horizontal: "center" }
        };
    }

    XLSX.writeFile(workbook, "Plantilla_Anexo_Cobros.xlsx");
};
