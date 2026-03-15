import * as XLSX from 'xlsx-js-style';
import { Client, Loan, Frequency, LoanStatus, PaymentStatus, CollectionLog, CollectionLogType } from '../types';
import { parseAmount, formatDate, generateUUID } from './helpers';
import { mapHeadersWithAI } from '../services/geminiService';

/**
 * Robustly parses dates from Excel, handling both serial numbers and strings.
 */
const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString();

    // Si es un número (Excel Serial Date)
    if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        return date.toISOString();
    }

    const str = String(val).trim();
    if (!str) return new Date().toISOString();

    // Intentar DD/MM/YYYY
    if (str.includes('/')) {
        const parts = str.split(' ')[0].split('/');
        if (parts.length === 3) {
            // Asumimos DD-MM-YYYY
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d.toISOString();
        }
    }

    const d = new Date(str);
    return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
};

export const EXCEL_COLUMNS = [
    "ID / Código", "Nombre Completo", "Cédula", "Teléfono Primario", "Teléfono Secundario",
    "Dirección Domicilio", "Nacionalidad", "Fecha Nacimiento", "Estado Civil", "Profesión",
    "Nombre Cónyuge", "Documento Cónyuge", "Fecha Nacimiento Cónyuge", "Profesión Cónyuge",
    "Lugar Trabajo Cónyuge", "Teléfono Laboral Cónyuge", "Ingresos Cónyuge",
    "Tipo Vivienda", "Antigüedad Residencia", "Latitud Domicilio", "Longitud Domicilio",
    "Calificación", "Tipo de Cliente", "Cód. Vendedor", "Capital Préstamo", "Interés (%)", "Cuotas Totales", "Frecuencia",
    "Valor Cuota", "Total a Pagar", "Fecha Inicio", "Estado Préstamo", "Saldo Actual",
    "Cuotas Pagadas", "Cuotas Pendientes", "Total Cobrado", "Días Atraso", "Última Fecha Pago",
    "Próximo Vencimiento", "Ref 1 Nombre", "Ref 1 Teléfono", "Ref 2 Nombre", "Ref 2 Teléfono",
    "Empresa/Negocio", "Dirección Negocio", "Rubro Negocio", "Notas"
];

export const exportClientsToExcel = (clients: Client[], loans: Loan[]) => {
    const data = clients.map(client => {
        const loan = loans.find(l => l.clientId === client.id && l.status !== LoanStatus.PAID) ||
            loans.filter(l => l.clientId === client.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        const paidInstallments = loan?.installments.filter(i => i.status === PaymentStatus.PAID).length || 0;
        const pendingInstallments = (loan?.totalInstallments || 0) - paidInstallments;
        const totalPaid = loan?.installments.reduce((acc, i) => acc + i.paidAmount, 0) || 0;

        return {
            "ID / Código": client.id,
            "Nombre Completo": client.name,
            "Cédula": client.documentId,
            "Teléfono Primario": client.phone,
            "Teléfono Secundario": client.secondaryPhone || "A COMPLETAR",
            "Dirección Domicilio": client.address,
            "Nacionalidad": client.nationality || "A COMPLETAR",
            "Fecha Nacimiento": client.birthDate ? formatDate(client.birthDate) : "A COMPLETAR",
            "Estado Civil": client.maritalStatus || "A COMPLETAR",
            "Profesión": client.profession || "A COMPLETAR",
            "Nombre Cónyuge": client.spouseName || "A COMPLETAR",
            "Documento Cónyuge": client.spouseDocumentId || "A COMPLETAR",
            "Fecha Nacimiento Cónyuge": client.spouseBirthDate ? formatDate(client.spouseBirthDate) : "A COMPLETAR",
            "Profesión Cónyuge": client.spouseProfession || "A COMPLETAR",
            "Lugar Trabajo Cónyuge": client.spouseWorkplace || "A COMPLETAR",
            "Teléfono Laboral Cónyuge": client.spouseWorkPhone || "A COMPLETAR",
            "Ingresos Cónyuge": client.spouseIncome || 0,
            "Tipo Vivienda": client.residenceType || "A COMPLETAR",
            "Antigüedad Residencia": client.residenceAntiquity || "A COMPLETAR",
            "Latitud Domicilio": client.location?.lat || 0,
            "Longitud Domicilio": client.location?.lng || 0,
            "Calificación": client.systemRating || "N/A",
            "Tipo de Cliente": client.clientType || "A COMPLETAR",
            "Cód. Vendedor": client.sellerCode || loan?.sellerCode || "N/A",
            "Cód. Tipo Cliente": client.clientTypeCode || "131",
            "Cód. Operación": loan?.operationTypeCode || "202",
            "Capital Préstamo": loan?.principal || 0,
            "Interés (%)": loan?.interestRate || 0,
            "Cuotas Totales": loan?.totalInstallments || 0,
            "Frecuencia": loan?.frequency || "A COMPLETAR",
            "Valor Cuota": loan?.installmentValue || 0,
            "Total a Pagar": loan?.totalAmount || 0,
            "Fecha Inicio": loan?.createdAt ? new Date(loan.createdAt).toISOString().split('T')[0] : "A COMPLETAR",
            "Estado Préstamo": loan?.status || "SIN CRÉDITO",
            "Saldo Actual": client.currentBalance || 0,
            "Cuotas Pagadas": paidInstallments,
            "Cuotas Pendientes": pendingInstallments,
            "Total Cobrado": totalPaid,
            "Días Atraso": 0, // Cálculo complejo omitido en local, se hace del lado del server si es posible
            "Última Fecha Pago": "N/A",
            "Próximo Vencimiento": "N/A",
            "Ref 1 Nombre": "A COMPLETAR",
            "Ref 1 Teléfono": "A COMPLETAR",
            "Ref 2 Nombre": "A COMPLETAR",
            "Ref 2 Teléfono": "A COMPLETAR",
            "Empresa/Negocio": client.workCompany || "A COMPLETAR",
            "Dirección Negocio": client.workStreetMain ? `${client.workStreetMain} ${client.workStreetSecondary || ''} ${client.workCity || ''}` : "A COMPLETAR",
            "Rubro Negocio": client.workSector || "A COMPLETAR",
            "Notas": "EXPORTADO DESDE SISTEMA"
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

export const processExcelImport = async (file: File, collectorId: string, branchId?: string, sellerCode?: string): Promise<{ clients: Client[], loans: Loan[], logs: CollectionLog[] }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to array of arrays to scan row by row
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                let clientHeaderRow = -1;
                let loanHeaderRow = -1;
                let maxClientScore = 0;
                let maxLoanScore = 0;

                const CLIENT_KEYWORDS = ["NOMBRE", "CLIENTE", "TITULAR", "RAZON SOCIAL", "RAZÓN SOCIAL", "DOCUMENTO", "CEDULA", "DNI", "IDENTIFICACION", "NOMBRES", "ID", "RAZON"];
                const LOAN_KEYWORDS = ["LIQUIDO", "CAPITAL", "MONTO", "PAGARE", "SALDO", "CUOTA", "INTERES", "PRESTAMO", "DEUDA", "IMP", "TOTAL", "PAGADO", "CANCELADO", "ESTADO", "CREDITO", "CRÉDITO", "PAGO", "OP", "IMPORT", "COBRADO", "HABILITADO", "V. CUOTA", "V CUOTA", "PENDIENTES", "PAGADAS"];

                // 1. Detect Header Rows with Scoring System
                for (let i = 0; i < Math.min(rows.length, 50); i++) { // Revise first 50 rows
                    const row = (rows[i] || []).map(c => String(c || '').toUpperCase());
                    
                    let cScore = 0;
                    let lScore = 0;
                    
                    row.forEach(cell => {
                        if (CLIENT_KEYWORDS.some(k => cell.includes(k))) cScore++;
                        if (LOAN_KEYWORDS.some(k => cell.includes(k))) lScore++;
                    });

                    if (cScore > maxClientScore) {
                        maxClientScore = cScore;
                        clientHeaderRow = i;
                    }
                    if (lScore > maxLoanScore) {
                        maxLoanScore = lScore;
                        loanHeaderRow = i;
                    }
                }

                if (clientHeaderRow === -1 && loanHeaderRow === -1) {
                    console.warn("⚠️ [FORENSIC] No se detectaron cabeceras claras por puntuación. Usando Fila 0 por defecto.");
                    clientHeaderRow = 0;
                    loanHeaderRow = 0;
                } else if (clientHeaderRow !== -1 && (loanHeaderRow === -1 || maxLoanScore < 2)) {
                    loanHeaderRow = clientHeaderRow;
                }

                if (clientHeaderRow === -1) {
                    // Fallback to old behavior if no special headers found
                    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
                    const clients: Client[] = [];
                    const loans: Loan[] = [];
                    jsonData.forEach((row, index) => {
                        const clientId = row["ID / Código"] || generateUUID();
                        clients.push({
                            id: clientId,
                            name: row["Nombre Completo"] || "NOMBRE A COMPLETAR",
                            documentId: String(row["Cédula"] || "0"),
                            phone: String(row["Teléfono Primario"] || "0"),
                            address: row["Dirección Domicilio"] || "DIRECCIÓN A COMPLETAR",
                            addedBy: collectorId,
                            creditLimit: Number(row["Capital Préstamo"]) || 1000000,
                            isActive: true,
                            branchId: branchId,
                            sellerCode: sellerCode,
                            clientTypeCode: "131",
                            createdAt: new Date().toISOString()
                        });
                        if (row["Capital Préstamo"]) {
                            loans.push({
                                id: `L-${clientId}`,
                                clientId,
                                collectorId,
                                principal: Number(row["Capital Préstamo"]),
                                interestRate: Number(row["Interés (%)"]) || 20,
                                totalInstallments: Number(row["Cuotas Totales"]) || 24,
                                frequency: (row["Frecuencia"] as Frequency) || Frequency.DAILY,
                                totalAmount: Number(row["Total a Pagar"]) || Number(row["Capital Préstamo"]) * 1.2,
                                installmentValue: Number(row["Valor Cuota"]) || 0,
                                status: LoanStatus.ACTIVE,
                                branchId: branchId,
                                sellerCode: sellerCode,
                                operationTypeCode: "202",
                                createdAt: new Date().toISOString(),
                                installments: []
                            });
                        }
                    });
                    resolve({ clients, loans, logs: [] });
                    return;
                }

                // Normalización agresiva para ignorar puntos, acentos, espacios y símbolos (/, -, etc)
                const normalizeHeader = (s: string) => 
                    String(s || '')
                        .toUpperCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                        .replace(/[^A-Z0-9]/g, "")       // QUITAR TODO lo que no sea letra o número
                        .trim();

                // 2. Map Columns for each section
                const getColMap = (headerRowIndex: number) => {
                    const map: Record<string, number> = {};
                    rows[headerRowIndex].forEach((val, idx) => {
                        const key = normalizeHeader(String(val || ''));
                        if (key) map[key] = idx;
                    });
                    return map;
                };

                const clientMap = getColMap(clientHeaderRow);
                const loanMap = loanHeaderRow !== -1 ? getColMap(loanHeaderRow) : null;

                console.log("🔍 [FORENSIC] Configuración de Importación:", { 
                    clientHeaderRow, 
                    loanHeaderRow, 
                    clientMap, 
                    loanMap,
                    totalRows: rows.length,
                    headersFound: rows[clientHeaderRow]
                });

                // --- INTEGRACIÓN IA: DESCUBRIMIENTO DE COLUMNAS CON GEMINI ---
                // Tomamos una fila de ejemplo (la primera después de las cabeceras)
                const sampleRow = (rows[Math.max(clientHeaderRow, loanHeaderRow) + 1] || []).slice(0, 20);
                const allRawHeaders = rows[Math.max(clientHeaderRow, loanHeaderRow)] || [];
                
                let aiMap: Record<string, string> = {};
                try {
                    aiMap = await mapHeadersWithAI(allRawHeaders.map(h => String(h || '')), sampleRow);
                } catch (error) {
                    console.warn("⚠️ [IA] Error en Mapeo de IA:", error);
                }

                console.log("🤖 [FORENSIC] Mapeo de la IA:", aiMap);

                const findCol = (map: Record<string, number> | null, internalKey: string, synonyms: string[]) => {
                    if (!map) {
                        console.log(`❌ [FORENSIC] findCol: Mapa no proporcionado para '${internalKey}'`);
                        return undefined;
                    }
                    
                    // 1. Check Synonyms (PRIORITY: Exact/Synonym match is safer for known patterns)
                    for (const s of synonyms) {
                        const sNorm = normalizeHeader(s);
                        if (map[sNorm] !== undefined) {
                            console.log(`✅ [FORENSIC] Mapeo EXACTO: '${internalKey}' -> "${s}" (Col ${map[sNorm]})`);
                            return map[sNorm];
                        }
                        
                        // Partial match sobre las llaves normalizadas del mapa
                        const partial = Object.keys(map).find(k => k.includes(sNorm) || sNorm.includes(k));
                        if (partial !== undefined) {
                            console.log(`✅ [FORENSIC] Mapeo PARCIAL: '${internalKey}' -> "${partial}" (Col ${map[partial]})`);
                            return map[partial];
                        }
                    }

                    // 2. Check IA Mapping (FALLBACK: Use IA if synonyms fail)
                    const aiMatch = Object.entries(aiMap).find(([header, target]) => {
                        return target === internalKey && map[normalizeHeader(header)] !== undefined;
                    });
                    if (aiMatch) {
                        console.log(`🤖 [FORENSIC] IA encontró '${internalKey}' en columna: "${aiMatch[0]}" (Col ${map[normalizeHeader(aiMatch[0])]})`);
                        return map[normalizeHeader(aiMatch[0])];
                    }

                    console.log(`❌ [FORENSIC] No se encontró columna para: '${internalKey}'`);
                    return undefined;
                };

                const clients: Client[] = [];
                const loans: Loan[] = [];
                const logs: CollectionLog[] = [];

                // 3. Process Data
                let dataIndex = 0;
                for (let i = clientHeaderRow + 1; i < rows.length; i++) {
                    const cRow = rows[i];
                    const rawRowStr = JSON.stringify(cRow).toUpperCase();
                    const isTargetClient = rawRowStr.includes("MILNER") || rawRowStr.includes("JACINTO");
                    
                    if (isTargetClient) {
                        console.log(`🎯 [TARGET DEBUG] Fila detectada para Milner/Jacinto [Fila ${i}]:`, cRow);
                    } else {
                        console.log(`DEBUG [FILA ${i}]:`, cRow);
                    }
                    if (!cRow || cRow.length === 0) continue;

                    const nameIdx = findCol(clientMap, 'name', ["NOMBRE COMPLETO", "NOM. COMPLETO", "CLIENTE", "NOMBRE", "RAZON SOCIAL", "RAZÓN SOCIAL", "NOMBRES", "NOM COMPLETO", "TITULAR", "TITULAR/NOMBRE", "PAGADOR"]);
                    const rawName = String(cRow[nameIdx ?? -1] || '').trim();
                    
                    // Validaciones para saltar filas vacías o de totales
                    if (nameIdx === undefined || !rawName) continue; 
                    if (!isNaN(Number(rawName.replace(/\./g, '')))) continue; // Saltar si el nombre es solo un número (Fila de Totales)
                    if (rawName.toUpperCase().includes("TOTAL") || rawName.toUpperCase().includes("RESUMEN")) continue;
                    
                    const clientId = generateUUID();

                    // --- EMPIEZA MAPEADO CRUDO COMPLETO ---
                    // Captura todo lo que vino en la fila de Excel para este cliente
                    const clientRawData: Record<string, any> = {};
                    Object.entries(clientMap).forEach(([headerName, colIdx]) => {
                        const cellValue = cRow[colIdx];
                        if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
                            clientRawData[headerName] = cellValue;
                        }
                    });
                    // --- TERMINA MAPEADO CRUDO COMPLETO ---

                    const client: Client = {
                        id: clientId,
                        name: String(cRow[nameIdx ?? -1] || ''),
                        documentId: String(cRow[(findCol(clientMap, 'documentId', ["OP. Nº", "OP", "NRO OP", "OPERACION", "OPERACIÓN", "NRO DE DOCUMENTO", "CÉDULA", "CEDULA", "DNI", "IDENTIFICACION", "NRO DE DOCUMENTO DE IDENT.", "CI", "CED", "DOC", "NRO DOC", "ID", "DOCUMENTO", "CC", "CODIGO", "NRO CLIENTE", "IDENTIFICACIÓN", "NIE"]) ?? -1)] || '0'),
                        phone: String(cRow[(findCol(clientMap, 'phone', ["TELÉFONO", "TELEFONO", "CELULAR", "MOVIL", "TELÉFONO PRIMARIO", "(PARTICULAR - TELÉFONO)", "(PARTICULAR - TELEFONO)", "TEL", "CEL", "MOV", "WHATSAPP", "CONTACTO", "TELF", "MOVIL 1", "PRODUCTO", "NRO CEL", "WPP", "WS", "CELULAR1"]) ?? -1)] || '0'),
                        secondaryPhone: String(cRow[(findCol(clientMap, 'secondaryPhone', ["TELÉFONO SECUNDARIO", "CELULAR 2", "CONTACTO 2", "PARTICULAR 2", "TEL 2", "CEL 2", "TEL SEC", "CEL SEC", "CELULAR2"]) ?? -1)] || 'SIN DATOS'),
                        address: String(cRow[(findCol(clientMap, 'address', ["DIRECCIÓN", "DIRECCION", "DOMICILIO", "CALLE", "DIRECCIÓN DOMICILIO", "(PARTICULAR - DIRECCIÓN)", "DIR", "DOM", "UBICACION", "RESIDENCIA", "DEPTO", "BARRIO", "HOGAR", "PARTICULAR"]) ?? -1)] || 'SIN DATOS'),
                        addedBy: collectorId,
                        branchId: branchId,
                        creditLimit: 1000000,
                        isActive: true,
                        createdAt: parseExcelDate(cRow[findCol(clientMap, 'date', ["FECHA", "REGISTRO", "ALTA", "FECHA REGISTRO", "FEC", "FCH"]) ?? -1]),
                        birthDate: cRow[findCol(clientMap, 'birthDate', ["FECHA NACIMIENTO", "FEC. NAC", "F. NACIMIENTO", "(FCH. NACIMIENTO)", "FECHA DE NACIMIENTO", "FEC NAC", "F NAC", "F. NACIM"]) ?? -1] ? parseExcelDate(cRow[findCol(clientMap, 'birthDate', ["FECHA NACIMIENTO", "FEC. NAC", "F. NACIMIENTO", "(FCH. NACIMIENTO)", "FECHA DE NACIMIENTO", "FEC NAC", "F NAC", "F. NACIM"]) ?? -1]) : undefined,
                        nationality: String(cRow[findCol(clientMap, 'nationality', ["NACIONALIDAD", "NACION", "PAÍS", "NAC"]) ?? -1] || 'SIN DATOS'),
                        maritalStatus: String(cRow[findCol(clientMap, 'maritalStatus', ["ESTADO CIVIL", "ESTADO", "EST CIV"]) ?? -1] || 'SIN DATOS'),
                        profession: String(cRow[findCol(clientMap, 'profession', ["PROFESIÓN", "PROFESION", "CARGO", "PROF"]) ?? -1] || 'SIN DATOS'),
                        email: String(cRow[findCol(clientMap, 'email', ["EMAIL", "CORREO", "E-MAIL", "MAIL"]) ?? -1] || 'SIN DATOS'),
                        // Datos Cónyuge
                        spouseName: String(cRow[findCol(clientMap, 'spouseName', ["NOMBRE CÓNYUGE", "NOMBRE CONYUGE", "CONYUGE", "NOMBRE DE LA PAREJA", "NOM CONY"]) ?? -1] || 'SIN DATOS'),
                        spouseDocumentId: String(cRow[findCol(clientMap, 'spouseDocumentId', ["DOCUMENTO CÓNYUGE", "CEDULA CONYUGE", "CI CONYUGE", "DOC CONY"]) ?? -1] || 'SIN DATOS'),
                        spouseBirthDate: cRow[findCol(clientMap, 'spouseBirthDate', ["FECHA NACIMIENTO CÓNYUGE", "FEC NAC CONYUGE", "F NAC CONY"]) ?? -1] ? parseExcelDate(cRow[findCol(clientMap, 'spouseBirthDate', ["FECHA NACIMIENTO CÓNYUGE", "FEC NAC CONYUGE", "F NAC CONY"]) ?? -1]) : undefined,
                        spouseProfession: String(cRow[findCol(clientMap, 'spouseProfession', ["PROFESIÓN CÓNYUGE", "PROFESION CONYUGE", "PROF CONY"]) ?? -1] || 'SIN DATOS'),
                        spouseWorkplace: String(cRow[findCol(clientMap, 'spouseWorkplace', ["LUGAR TRABAJO CÓNYUGE", "TRABAJO CONYUGE", "LUG TRAB CONY"]) ?? -1] || 'SIN DATOS'),
                        spouseWorkPhone: String(cRow[findCol(clientMap, 'spouseWorkPhone', ["TELÉFONO LABORAL CÓNYUGE", "TEL TRABAJO CONYUGE", "TEL LAB CONY"]) ?? -1] || 'SIN DATOS'),
                        spouseIncome: parseAmount(cRow[findCol(clientMap, 'spouseIncome', ["INGRESOS CÓNYUGE", "SUELDO CONYUGE", "ING CONY"]) ?? -1] || '0'),

                        // Residencia
                        residenceType: cRow[findCol(clientMap, 'residenceType', ["TIPO VIVIENDA", "TIPO DE CASA", "TIPO VIV"]) ?? -1] as any,
                        residenceAntiquity: String(cRow[findCol(clientMap, 'residenceAntiquity', ["ANTIGÜEDAD RESIDENCIA", "TIEMPO EN CASA", "ANTIG RES"]) ?? -1] || 'SIN DATOS'),
                        houseNumber: String(cRow[findCol(clientMap, 'houseNumber', ["NRO CASA", "NÙMERO CASA", "NRO DE CASA", "NRO HS"]) ?? -1] || 'SIN DATOS'),

                        particularCity: String(cRow[findCol(clientMap, 'particularCity', ["(PARTICULAR - CIUDAD)", "CIUDAD", "CIUDAD PARTICULAR", "CDAD", "CIUD"]) ?? -1] || 'SIN DATOS'),
                        particularNeighborhood: String(cRow[findCol(clientMap, 'particularNeighborhood', ["(PARTICULAR - BARRIO)", "BARRIO", "BARRIO PARTICULAR", "BARR"]) ?? -1] || 'SIN DATOS'),
                        particularStreetMain: String(cRow[findCol(clientMap, 'particularStreetMain', ["CALLE PRINCIPAL", "(PARTICULAR - DIRECCIÓN - CALLE PRINCIPAL)", "DIRECCIÓN PARTICULAR", "C PRINCIPAL"]) ?? -1] || 'SIN DATOS'),
                        particularStreetSecondary: String(cRow[findCol(clientMap, 'particularStreetSecondary', ["CALLE SECUNDARIA", "(PARTICULAR - DIRECCIÓN - CALLE SECUNDARIA)", "(PARTICULAR - DIRECCIÓN - CALLE SECONDARIA)", "C SECUNDARIA"]) ?? -1] || 'SIN DATOS'),

                        // Datos Laborales
                        workCompany: String(cRow[findCol(clientMap, 'workCompany', ["LABORAL EMPRESA/NEGOCIO", "EMPRESA", "EMPRESA/NEGOCIO", "LUGAR DE TRABAJO", "LABORAL  EMPRESA/NEGOCIO", "EMPR", "NEG"]) ?? -1] || 'SIN DATOS'),
                        workStreetMain: String(cRow[findCol(clientMap, 'workStreetMain', ["DIRECCIÓN NEGOCIO", "CALLE LABORAL", "(LABORAL - DIRECCIÓN - CALLE PRINCIPAL)", "DIR NEG"]) ?? -1] || 'SIN DATOS'),
                        workStreetSecondary: String(cRow[findCol(clientMap, 'workStreetSecondary', ["CALLE SECUNDARIA LABORAL", "(LABORAL - DIRECCIÓN - CALLE SECUNDARIA)", "(LABORAL - DIRECCIÓN - CALLE SECONDARIA)"]) ?? -1] || 'SIN DATOS'),
                        workCity: String(cRow[findCol(clientMap, 'workCity', ["CIUDAD LABORAL", "(LABORAL -  CIUDAD)", "CDAD LAB"]) ?? -1] || 'SIN DATOS'),
                        workNeighborhood: String(cRow[findCol(clientMap, 'workNeighborhood', ["BARRIO LABORAL", "(LABORAL - BARRIO)", "BARR LAB"]) ?? -1] || 'SIN DATOS'),
                        workPosition: String(cRow[findCol(clientMap, 'workPosition', ["CARGO"]) ?? -1] || 'SIN DATOS'),
                        workSector: String(cRow[findCol(clientMap, 'workSector', ["RUBRO", "RUBRO NEGOCIO"]) ?? -1] || 'SIN DATOS'),
                        workAntiquity: String(cRow[findCol(clientMap, 'workAntiquity', ["(ANTIGÜEDAD)", "ANTIGUEDAD", "ANTIGÜEDAD", "ANTIG"]) ?? -1] || 'SIN DATOS'),
                        workIncome: parseAmount(cRow[findCol(clientMap, 'workIncome', ["(LABORAL INGRESOS / SALARIO)", "SALARIO / INGRESOS", "SALARIO", "ING LAB"]) ?? -1] || '0'),
                        workPhone: String(cRow[findCol(clientMap, 'workPhone', ["TELÉFONO LABORAL", "TELÉFONO NEGOCIO", "(LABORAL - TELÉFONO)", "(LABORAL - TELEFONO)", "TEL LAB", "TEL NEG"]) ?? -1] || 'SIN DATOS'),

                        clientTypeCode: String(cRow[findCol(clientMap, 'clientType', ["BANCA (TIPO DE CLIENTE)", "BANCA", "TIPO CLIENTE", "BANCA (TIPO DE CLIENTE", "TIPO CLT"]) ?? -1] || '131'),
                        systemRating: String(cRow[findCol(clientMap, 'rating', ["CALIFICACION EN EL SISTEMA", "CALIFICACION", "CALIF"]) ?? -1] || ''),
                        sellerCode: String(cRow[findCol(clientMap, 'seller', ["CODIGO DE VENDEDOR", "CODIGO VENDEDOR", "VENDEDOR", "CÓD. VENDEDOR"]) ?? -1] || sellerCode || ''),
                        externalId: String(cRow[findCol(clientMap, 'externalId', ["NRO DE OPERACIÓN EN SISTEMA BASE", "OPERACION BASE", "NRO OPERACION", "ID BASE", "ID EXTERNO", "NRO DE OPERACIÓN EN SISTEMA BASE"]) ?? -1] || '').replace(/\D/g, ''),
                        raw_data: clientRawData
                    };
                    clients.push(client);

                    // Find corresponding loan row if loan block exists
                    if (loanMap) {
                        const lRowIndex = loanHeaderRow + 1 + dataIndex;
                        const lRow = rows[lRowIndex];
                        if (lRow && lRow.length > 0) {
                            // --- MAPEADO CRUDO PRÉSTAMO ---
                            const loanRawData: Record<string, any> = {};
                            Object.entries(loanMap).forEach(([headerName, colIdx]) => {
                                const cellValue = lRow[colIdx];
                                if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
                                    loanRawData[headerName] = cellValue;
                                }
                            });

                            const principalIdx = findCol(loanMap, 'principal', ["HABILITADO", "MONTO HABILITADO", "LIQUIDO DESEMBOLSADO", "LIQ. DESEMB", "LIQUIDO", "CAPITAL INICIAL", "MONTO CREDITO", "PRINCIPAL", "CAPITAL", "CREDITO", "CRÉDITO"]);
                            const rawPrincipal = lRow[principalIdx ?? -1];
                            const principal = parseAmount(rawPrincipal);
                            console.log(`💰 [FORENSIC] Campo 'principal': ColIdx=${principalIdx}, Original="${rawPrincipal}", Final=${principal}`);

                            const importedBalanceIdx = findCol(loanMap, 'balance', ["SALDO ACTUAL", "SALDO PENDIENTE", "SALDO TOTAL", "SALDO", "SALDO PEND", "SALDO PEND.", "DEUDA ACTUAL", "RESTANTE", "TOTAL DEUDA", "SALDO A PAGAR", "SALDO DEUDOR", "MONTO PENDIENTE", "RESTO", "SALDOS", "SALDO CAPITAL", "SALDO CAP", "DEUDA"]);
                            const rawBalance = lRow[importedBalanceIdx ?? -1];
                            const legacyBalance = parseAmount(rawBalance);
                            console.log(`💰 [FORENSIC] Campo 'balance': ColIdx=${importedBalanceIdx}, Original="${rawBalance}", Final=${legacyBalance}`);

                            // 2. Obtener valores financieros clave usando findCol (Inteligente)
                            const totalAmountIdx = findCol(loanMap, 'totalAmount', ["TOTAL A PAGAR", "MONTO TOTAL", "TOTAL", "TOTAL DEVENSIÓN", "MONTO TOTAL PAGARE", "PLANILLA", "TOTAL CREDITO", "IMPORTE TOTAL", "TOTAL PAGAR", "TOTAL A ABONAR", "IMPORT. PAGARE", "IMPORT PAGARE", "MONTO PAGARE", "MONTO PAG", "MONTO", "PAGARE"]);
                            const totalAmountExcel = parseAmount(lRow[totalAmountIdx ?? -1]);

                            const capitalIdx = findCol(loanMap, 'capitalBalance', ["SALDO CAPITAL", "SALDO CAP", "CAPITAL", "DEUDA CAPITAL", "CAPITAL RESTANTE"]);
                            const valCapital = parseAmount(lRow[capitalIdx ?? -1]);

                            const interestIdx = findCol(loanMap, 'interestBalance', ["SALDO INTERES", "SALDO INT", "INTERES", "INTERÉS", "DEUDA INTERES", "RESTANTE INTERES"]);
                            const valInterest = parseAmount(lRow[interestIdx ?? -1]);

                            // 2.1 Fallback para Principal (Si no hay líquido, usar saldo capital inicial)
                            let finalPrincipal = principal;
                            if (finalPrincipal === 0 && valCapital > 0) {
                                finalPrincipal = valCapital;
                            }

                            // RECONSTRUCCIÓN MATEMÁTICA v2.4 (Requerimiento Usuario)
                            // 1. Obtener Monto Cuota y Cantidades
                            const instValueIdx = findCol(loanMap, 'installmentValue', ["V. CUOTA", "V CUOTA", "MONTO CUOTA", "VAL. CUOTA", "VAL CUOTA", "VALOR CUOTA", "CUOTA", "PRECIO CUOTA", "IMPORTE CUOTA", "VALOR PLAN", "VALOR CUOTAS", "VALOR INICIAL CUOTA"]);
                            const instValue = parseAmount(lRow[instValueIdx ?? -1]);

                            const totalInstIdx = findCol(loanMap, 'totalInstallments', ["CUOTAS TOTALES", "CUOTAS TOT", "PLAZO", "CANT. CUOTAS", "CANT CUOTAS", "CANT CUOTA", "TOTAL CTAS", "NRO CUOTAS", "TIEMPO", "MESES", "SEMANAS", "CUOTAS", "CANT", "TOTAL CUOTAS"]);
                            const totalInstInput = parseAmount(lRow[totalInstIdx ?? -1] || 0);
                            console.log(`🧮 [FORENSIC] Cuotas Totales: ColIdx=${totalInstIdx}, Header="${lRow[totalInstIdx ?? -1]}", Final=${totalInstInput}`);

                            const pendingInstIdx = findCol(loanMap, 'pendingInstallments', ["C. PENDIENTES", "CUOTAS PENDIENTES", "CTAS. PEND", "CTAS PEND", "CTAS. PEND.", "CUOTAS PENDIENTE", "CUOTA PENDIENTE", "CUOTAS PEND", "RESTANTES", "PENDIENTES", "SALDO CUOTAS", "CUOTAS FALTANTES", "COBRAR CUOTAS", "FALTANTES", "PENDIENTE", "RESTANTE", "DEUDA CUOTAS", "PEN", "CP"]);
                            const rawPending = lRow[pendingInstIdx ?? -1];
                            const pendingInst = parseAmount(rawPending || 0);
                            
                            const paidTotalIdx = findCol(loanMap, 'paidAmountTotal', ["MONTO COBRADO", "TOTAL COBRADO", "PAGADO", "TOTAL PAGADO", "COBRADO", "CUOTA COBRADA", "IMPORT. COBRADO", "ACUMULADO PAGADO"]);
                            const excelPaidTotal = parseAmount(lRow[paidTotalIdx ?? -1] || 0);

                            console.log(`🧮 [FORENSIC] Cuotas Pendientes: ColIdx=${pendingInstIdx}, Header="${rawPending}", Final=${pendingInst}`);
                            console.log(`🧮 [FORENSIC] Monto Cobrado Excel: ColIdx=${paidTotalIdx}, Header="${lRow[paidTotalIdx ?? -1]}", Final=${excelPaidTotal}`);

                            const paidInstIdx = findCol(loanMap, 'paidInstallments', ["FECHA ULTIMO PAGO", "ULTIMO PAGO", "C. PAGADAS", "CUOTAS PAGADAS", "CTA. PAG", "CTA PAG", "CTA. PAG.", "CUOTAS PAG", "CANT. PAG.", "PAGADAS", "CUOTAS COBRADAS", "CUOTAS TIENE", "COBRADAS", "PAGAS", "YA PAGAS", "ABONADAS", "CANCELADAS", "PAGOS", "PAG", "CPG"]);
                            const rawPaid = lRow[paidInstIdx ?? -1];
                            let paidInst = parseAmount(rawPaid || 0);
                            console.log(`🧮 [FORENSIC] Cuotas Pagadas: ColIdx=${paidInstIdx}, Header="${rawPaid}", Final=${paidInst}`);

                            const interestRateIdx = findCol(loanMap, 'interestRate', ["PORCENTAJE DE INTERES", "PORCENTAJE DE INTERÉS", "TASA", "INTERES", "INTERÉS", "%", "TASA DE INTERES", "TASA DE INTERÉS", "% INT", "PORCENTAJE", "VALOR INTERES"]);
                            const importedInterestRate = parseAmount(lRow[interestRateIdx ?? -1] || 0);

                            // Si no viene el total de cuotas, intentar deducirlo de pagadas + pendientes
                            const totalInst = totalInstInput || (paidInst + pendingInst) || 24; 
                            
                            // 2. Aplicar Fórmulas del Usuario
                            // Monto Total = Cuotas Totales * Monto Cuota
                            let totalAmount = totalInst * instValue;

                            // Fallback 1: Si no tenemos monto de cuota pero sí total y cuotas totales, deducirlo
                            let finalInstValue = instValue;
                            if (finalInstValue === 0 && totalAmountExcel > 0 && totalInst > 0) {
                                finalInstValue = Math.round(totalAmountExcel / totalInst);
                                if (totalAmount === 0) totalAmount = totalAmountExcel;
                                console.log(`🧮 [MATH v2.4] Cuota estimada (Total/Cuotas): ${finalInstValue}`);
                            }

                            // 4. Determinar Saldo Final (REQUERIMIENTO v2.12 - PRIORIDAD ABSOLUTA)
                            // A. Prioridad 1: Campo "Saldo" directo (legacyBalance)
                            // B. Prioridad 2: Suma de Saldo Capital + Saldo Interes
                            // C. Prioridad 3: Cálculo por Cuotas Pendientes
                            
                            const sumBalance = valCapital + valInterest;
                            let importedBalance = 0;

                            if (legacyBalance > 0) {
                                importedBalance = legacyBalance;
                                console.log(`🧮 [MATH v2.12] Saldo PRIORITARIO por columna "Saldo": ${importedBalance}`);
                            } else if (sumBalance > 0) {
                                importedBalance = sumBalance;
                                console.log(`🧮 [MATH v2.12] Saldo por SUMA (Cap + Int): ${valCapital} + ${valInterest} = ${importedBalance}`);
                            } else if (pendingInst > 0) {
                                importedBalance = pendingInst * instValue;
                                console.log(`🧮 [MATH v2.12] Saldo por CUOTAS: ${pendingInst} * ${instValue} = ${importedBalance}`);
                            }

                            // Si no hay cuotas pagadas explícitas, deducirlas del saldo
                            if (paidInst === 0 && totalInst > 0 && totalAmount > importedBalance) {
                                paidInst = Math.round((totalAmount - importedBalance) / (instValue || 1));
                            }

                            console.log(`🧮 [MATH FORENSIC v2.12] Cuota=${instValue} | Totales=${totalInst} | Pendientes=${pendingInst} | Pagadas=${paidInst}`);
                             console.log(`🧮 [MATH FORENSIC v2.12] RESULTADO -> Total=${totalAmount} | Saldo=${importedBalance}`);

                             // Fallback por si lo anterior falla (v2.13)
                             if (totalAmount === 0) {
                                 totalAmount = totalAmountExcel || (valCapital + valInterest) || principal;
                             }
                             if (finalPrincipal === 0 && totalAmount > 0) {
                                 // Si no tenemos principal pero si total, asumir un interés del 20% para estimar el principal
                                 finalPrincipal = Math.round(totalAmount / 1.25);
                             }

                            // 5. Detectar frecuencia (INTELIGENTE)
                            let frequency = Frequency.DAILY;
                            const freqIdx = findCol(loanMap, 'frequency', ["FRECUENCIA", "MODALIDAD"]);
                            const freqStr = String(lRow[freqIdx ?? -1] || '').toUpperCase();
                            if (freqStr.includes('SEM') || freqStr.includes('7 D')) frequency = Frequency.WEEKLY;
                            else if (freqStr.includes('QUIN') || freqStr.includes('15 D')) frequency = Frequency.BIWEEKLY;
                            else if (freqStr.includes('MEN') || freqStr.includes('30 D')) frequency = Frequency.MONTHLY;
                            // ---------------------------------------------

                            const loan: Loan = {
                                id: `L-${clientId}`,
                                clientId,
                                collectorId,
                                principal: finalPrincipal,
                                totalAmount,
                                totalInstallments: totalInst,
                                installmentValue: instValue,
                                totalPaid: Math.round((totalAmount - importedBalance) * 100) / 100,
                                balance: Math.round(importedBalance * 100) / 100,
                                frequency,
                                status: importedBalance <= 100 ? LoanStatus.PAID : LoanStatus.ACTIVE,
                                branchId: branchId,
                                operationTypeCode: String(lRow[findCol(loanMap, 'operationType', ["TIPO DE OPERACION", "TIPO OPERACION", "TIPO OP"]) ?? -1] || '202'),
                                sellerCode: String(lRow[findCol(loanMap, 'seller', ["CODIGO DE VENDEDOR", "CODIGO VENDEDOR", "VENDEDOR", "CÓD. VENDEDOR"]) ?? -1] || sellerCode || ''),
                                interestRate: importedInterestRate || (finalPrincipal > 0 ? Math.round(((totalAmount / finalPrincipal) - 1) * 100) : 20),
                                createdAt: parseExcelDate(lRow[findCol(loanMap, 'date', ["FECHA DE DESEMBOLSO", "FEC. DESEMB", "FECHA INICIO", "FECHA PAGAR"]) ?? -1]),
                                installments: [],
                                raw_data: loanRawData // <-- GUARDA TODO
                            };

                            // GENERACIÓN DE CUOTAS - VERSIÓN 3.0 (DELEGACIÓN A LOGS)
                            // Para evitar el error de "Saldo en Cero" por doble pago, creamos todas las cuotas como PENDING
                            // y dejamos que addBulkData use el CollectionLog para marcarlas como pagadas.
                            loan.installments = []; 
                            for (let j = 1; j <= totalInst; j++) {
                                loan.installments.push({
                                    number: j,
                                    amount: finalInstValue,
                                    dueDate: new Date().toISOString(), 
                                    status: PaymentStatus.PENDING, // <-- SIEMPRE PENDING AL INICIO
                                    paidAmount: 0 // <-- SIEMPRE 0 AL INICIO
                                });
                            }

                            // 5. GENERAR LOG HISTÓRICO "RECONSTRUIDO" (v3.0)
                            // Calculamos cuánto se ha pagado según el Excel para aplicarlo en el sistema
                            let logAmount = 0;
                            if (excelPaidTotal > 0) {
                                logAmount = excelPaidTotal;
                            } else {
                                logAmount = Math.max(0, totalAmount - importedBalance);
                            }

                            console.log(`📝 [LOG RECONSTRUCTION] ClientID: ${clientId}, LogAmount=${logAmount}, FinalBalanceShouldBe=${importedBalance}`);

                            if (logAmount > 0) {
                                logs.push({
                                    id: generateUUID(),
                                    loanId: loan.id,
                                    clientId: client.id,
                                    type: CollectionLogType.PAYMENT,
                                    amount: logAmount,
                                    date: loan.createdAt || new Date().toISOString(), 
                                    location: { lat: 0, lng: 0 },
                                    isOpening: false, 
                                    notes: "Importación Histórica Excel (Ajuste de Saldo)",
                                    branchId: branchId,
                                    recordedBy: collectorId
                                });
                            }

                             if (finalPrincipal > 0 || totalAmountExcel > 0) {
                                 loans.push(loan);
                                 console.log(`✅ [FORENSIC] Préstamo creado para: ${client.name}`);
                             } else {
                                 console.warn(`⚠️ [FORENSIC] Préstamo NO creado para ${client.name}: Principal y Total son 0`);
                             }
                            // Update client current balance
                            client.capital = finalPrincipal;
                            client.currentBalance = Math.round(importedBalance * 100) / 100;
                        }
                    }
                    dataIndex++;
                }

                resolve({ clients, loans, logs });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const downloadExcelTemplate = () => {
    const headers = [
        "IDENTIFICACION", "NOMBRE", "CELULAR", "DIRECCION", 
        "HABILITADO", "V. CUOTA", "TOTAL CREDITO", "CANT CUOTAS",
        "C. PENDIENTES", "SALDO ACTUAL", "FECHA ALTA"
    ];
    
    const exampleData = [
        [
            "1234567", "JUAN PEREZ", "0981123456", "CALLE FALSA 123", 
            2000000, 100000, 2400000, 24, 
            12, 1200000, "13/03/2026"
        ],
        [
            "7654321", "MARIA GARCIA", "0971654321", "AVENIDA SIEMPRE VIVA 742", 
            1500000, 75000, 1800000, 24, 
            24, 1800000, "13/03/2026"
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
