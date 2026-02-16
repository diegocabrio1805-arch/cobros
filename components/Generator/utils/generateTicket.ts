import { DocumentData, DocumentType } from '../types';

export const generateBluetoothTicket = (doc: Partial<DocumentData>): string => {
    const divider = "--------------------------------\n";
    let text = "";

    if (doc.type === DocumentType.RECIBO) {
        text += "<B1><GS1>RECIBO DE PAGO<GS0><B0>\n";
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
        text += "\n\n\n\n"; // Space for tearing
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
