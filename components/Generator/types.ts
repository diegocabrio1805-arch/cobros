export type DocumentType = 'Pagaré' | 'Recibo' | 'Manual';

export const DocumentType = {
    PAGARE: 'Pagaré' as DocumentType,
    RECIBO: 'Recibo' as DocumentType,
    MANUAL: 'Manual' as DocumentType
};

export type PaperSize = 'A4' | 'Oficio' | 'Thermal58mm';

export interface TextTemplate {
    id: string;
    name: string;
    content: string;
    type: DocumentType;
}

export interface DocumentData {
    id: string;
    type: DocumentType;
    folio: string;
    date: string;
    amount: number;
    currencySymbol: string;
    currencyName: string;
    amountInWords: string;
    concept: string;
    debtorName: string;
    beneficiaryName: string;
    phoneNumber?: string;
    paymentMethod?: 'Efectivo' | 'Cheque' | 'Transferencia';
    legalText: string;
    documentIdNumber?: string;
    dueDate?: string;
    createdAt: number;
    // Company / Settings Data
    companyName?: string;
    companyIdentifier?: string;
    companyAlias?: string; // Brand
    contactPhone?: string;
    shareLabel?: string; // Bank Name
    shareValue?: string; // Account Number
    receiptPrintMargin?: number;
}
