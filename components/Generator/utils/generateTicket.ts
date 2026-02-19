import { DocumentData, DocumentType } from '../types';

export const generateBluetoothTicket = (doc: Partial<DocumentData>): string => {
    const divider = "--------------------------------\n";
    let text = "";

    if (doc.type === DocumentType.RECIBO) {
        // --- COMPANY HEADER ---
        if (doc.companyName) {
            text += `<B1><GS1>${doc.companyName.toUpperCase()}<GS0><B0>\n`;
        }
        if (doc.companyAlias) {
            text += `${doc.companyAlias.toUpperCase()}\n`;
        }
        if (doc.companyIdentifier) {
            text += `RUC/ID: ${doc.companyIdentifier}\n`;
        }
        if (doc.contactPhone) {
            text += `Tel: ${doc.contactPhone}\n`;
        }
        // Bank Information
        if (doc.shareLabel || doc.shareValue) {
            text += divider;
            if (doc.shareLabel) text += `${doc.shareLabel}\n`;
            if (doc.shareValue) text += `${doc.shareValue}\n`;
        }

        text += divider;
        text += "<B1>RECIBO DE PAGO<B0>\n";
        text += `Fecha: ${doc.date || ''}\n`;
        text += `Folio: ${doc.folio || ''}\n`;
        text += divider;
        text += "<B1>Recibí de:<B0>\n";
        text += `${doc.debtorName || ''}\n`;
        text += divider;
        text += `<B1>Monto: ${doc.currencySymbol} ${doc.amount?.toLocaleString()}<B0>\n`;
        text += `(${doc.amountInWords} ${doc.currencyName})\n`;
        text += divider;
        text += "<B1>Concepto:<B0>\n";
        text += `${doc.concept || ''}\n`;
        text += divider;
        text += `Pago: ${doc.paymentMethod || 'Efectivo'}\n`;
        text += divider;
        text += "<B1>Recibido por:<B0>\n";
        text += `${doc.beneficiaryName || ''}\n`;
        if (doc.documentIdNumber) text += `ID: ${doc.documentIdNumber}\n`;
        if (doc.phoneNumber) text += `Tel: ${doc.phoneNumber}\n`;
        text += divider;
        text += divider;

        // Dynamic Bottom Margin
        const lines = doc.receiptPrintMargin || 2;
        text += "\n".repeat(lines + 2); // Base spacing + user setting
    } else {
        // PAGARE
        text += "<B1><GS1>PAGARE A LA ORDEN<GS0><B0>\n";
        text += `Vencimiento: ${doc.date || ''}\n`;
        text += `<B1>Monto: ${doc.currencySymbol} ${doc.amount?.toLocaleString()}<B0>\n`;
        text += divider;

        let bodyText = doc.legalText || '';
        bodyText = bodyText
            .replace(/\[FECHA\]/g, doc.date || '___/___/___')
            .replace(/\[MONEDA_NOMBRE\]/g, (doc.currencyName || '').toUpperCase())
            .replace(/\[MONTO_LETRAS\]/g, (doc.amountInWords || '').toUpperCase())
            .replace(/\[CONCEPTO\]/g, (doc.concept || ''))
            .replace(/\[DOMICILIO\]/g, (doc.beneficiaryName || ''))
            .replace(/\[DEUDOR_NOMBRE\]/g, (doc.debtorName || ''));

        text += `${bodyText}\n`;
        text += divider;
        text += "\n<B1>Firma:<B0>\n\n\n";
        text += "________________________________\n";
        text += `Nombre: ${doc.debtorName || ''}\n`;
        if (doc.documentIdNumber) text += `ID: ${doc.documentIdNumber}\n`;
        text += divider;
        text += "\n\n\n\n";
    }

    return text;
};
