import React from 'react';
import { convertReceiptForWhatsApp } from '../utils/helpers';

interface ColoredReceiptProps {
  receipt: string;
}

export const ColoredReceipt: React.FC<ColoredReceiptProps> = ({ receipt }) => {
  const cleanReceipt = convertReceiptForWhatsApp(receipt || '');
  
  return (
    <>
      {cleanReceipt.split('\n').map((line, i) => {
        let colorClass = '';
        const upperLine = line.toUpperCase();
        
        // Match main translations for Previous Balance, Payment and Current Balance
        if (upperLine.includes('SALDO ANTERIOR') || upperLine.includes('PREVIOUS BALANCE') || upperLine.includes('SOLDE PRÉCÉDENT')) {
          colorClass = 'text-red-600';
        } else if (upperLine.includes('ABONO') || upperLine.includes('PAYMENT') || upperLine.includes('PAIEMENT') || upperLine.includes('PAGAMENTO')) {
          colorClass = 'text-green-600';
        } else if (upperLine.includes('SALDO ACTUAL') || upperLine.includes('CURRENT BALANCE') || upperLine.includes('SOLDE ACTUEL') || upperLine.includes('SALDO ATUAL')) {
          colorClass = 'text-blue-600';
        } else if (upperLine.includes('DÍAS DE MORA') || upperLine.includes('DIAS DE MORA') || upperLine.includes('DAYS OVERDUE') || upperLine.includes('JOURS DE RETARD') || upperLine.includes('DIAS EM ATRASO')) {
          const match = line.match(/\d+/);
          if (match) {
            const days = parseInt(match[0], 10);
            if (days >= 0 && days <= 20) {
              colorClass = 'text-green-600';
            } else if (days >= 21 && days <= 35) {
              colorClass = 'text-blue-600';
            } else if (days >= 36) {
              colorClass = 'text-red-600';
            }
          }
        }
        
        return (
          <span key={i} className={`block ${colorClass}`}>
            {line}
          </span>
        );
      })}
    </>
  );
};
