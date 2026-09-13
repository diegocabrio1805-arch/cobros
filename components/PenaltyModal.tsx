import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Loan, Penalty } from '../types';
import { formatCurrency, generateUUID } from '../utils/helpers';
import { supabase } from '../utils/supabaseClient';

interface PenaltyModalProps {
  loan: Loan;
  state: AppState;
  onClose: () => void;
  onSuccess: (updatedLoan: Loan, penalty: Penalty) => void;
}

const PenaltyModal: React.FC<PenaltyModalProps> = ({ loan, state, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const fmt = (n: number) => formatCurrency(n, state.settings);

  // ─── Cálculo del impacto en tiempo real ──────────────────────────────────────
  const preview = useMemo(() => {
    const penaltyAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
    if (penaltyAmount <= 0) return null;

    const cuotaVal = loan.installmentValue || 1;
    const currentBalance = loan.balance ?? loan.totalAmount;

    // Cuotas extras (floor) y resto para la última cuota
    const extraInstallments = Math.floor(penaltyAmount / cuotaVal);
    const lastInstAmount = penaltyAmount % cuotaVal; // el sobrante se suma a la última cuota extra

    const newTotalInstallments = loan.totalInstallments + extraInstallments;
    const newTotalAmount = loan.totalAmount + penaltyAmount;
    const newBalance = currentBalance + penaltyAmount;

    return {
      penaltyAmount,
      extraInstallments,
      lastInstAmount,
      newTotalInstallments,
      newTotalAmount,
      newBalance,
    };
  }, [amount, loan]);

  // ─── Guardar ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!preview || preview.penaltyAmount <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    setIsSaving(true);
    setError('');

    try {
      const branchId = state.currentUser?.role === 'Cobrador'
        ? state.currentUser.managedBy
        : state.currentUser?.id;

      const penaltyId = generateUUID();
      const now = new Date().toISOString();

      // 1. Insertar en tabla penalties (auditoría)
      const { error: penErr } = await supabase.from('penalties').insert({
        id: penaltyId,
        loan_id: loan.id,
        client_id: loan.clientId,
        branch_id: branchId || null,
        amount: preview.penaltyAmount,
        reason: reason.trim() || null,
        added_by: state.currentUser?.id || null,
        extra_installments: preview.extraInstallments,
        last_installment_amount: preview.lastInstAmount,
        created_at: now,
      });
      if (penErr) throw new Error(penErr.message);

      // 2. Actualizar préstamo en Supabase
      const { error: loanErr } = await supabase
        .from('loans')
        .update({
          total_amount: preview.newTotalAmount,
          total_installments: preview.newTotalInstallments,
          balance: preview.newBalance,
          updated_at: now,
        })
        .eq('id', loan.id);
      if (loanErr) throw new Error(loanErr.message);

      // 3. Construir el objeto loan actualizado para el estado local
      const updatedLoan: Loan = {
        ...loan,
        totalAmount: preview.newTotalAmount,
        totalInstallments: preview.newTotalInstallments,
        balance: preview.newBalance,
        updatedAt: now,
        updated_at: now,
      };

      const penaltyRecord: Penalty = {
        id: penaltyId,
        loanId: loan.id,
        clientId: loan.clientId,
        branchId: branchId,
        amount: preview.penaltyAmount,
        reason: reason.trim() || undefined,
        addedBy: state.currentUser?.id,
        extraInstallments: preview.extraInstallments,
        lastInstallmentAmount: preview.lastInstAmount,
        createdAt: now,
      };

      onSuccess(updatedLoan, penaltyRecord);
    } catch (e: any) {
      setError('Error al guardar: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-[9999] p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-orange-600 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-triangle-exclamation text-white text-lg"></i>
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tighter">Agregar Penalización</h3>
            <p className="text-[9px] font-bold text-orange-100 uppercase tracking-widest truncate max-w-[200px]">
              {state.clients.find(c => c.id === loan.clientId)?.name || 'Cliente'}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
            <i className="fa-solid fa-xmark text-white text-sm"></i>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info actual */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo</p>
              <p className="text-[11px] font-black text-slate-800 font-mono">{fmt(loan.balance ?? loan.totalAmount)}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cuota</p>
              <p className="text-[11px] font-black text-blue-600 font-mono">{fmt(loan.installmentValue)}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cuotas</p>
              <p className="text-[11px] font-black text-slate-800 font-mono">{loan.totalInstallments}</p>
            </div>
          </div>

          {/* Monto penalización */}
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Monto de Penalización *
            </label>
            <input
              id="penalty-amount-input"
              type="number"
              min="0"
              placeholder="Ej: 100000"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(''); }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black font-mono text-orange-600 outline-none focus:ring-2 focus:ring-orange-400 text-right"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Motivo (opcional)
            </label>
            <input
              id="penalty-reason-input"
              type="text"
              placeholder="Ej: Atraso de 2 semanas"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Preview del impacto */}
          {preview && preview.penaltyAmount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2 animate-fadeIn">
              <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest text-center">Vista Previa del Impacto</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white rounded-md p-2 border border-orange-100">
                  <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Saldo nuevo</p>
                  <p className="text-xs font-black text-orange-600 font-mono">{fmt(preview.newBalance)}</p>
                </div>
                <div className="bg-white rounded-md p-2 border border-orange-100">
                  <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Cuotas nuevas</p>
                  <p className="text-xs font-black text-orange-600 font-mono">{preview.newTotalInstallments}</p>
                </div>
              </div>
              <div className="bg-white rounded-md p-2 border border-orange-100 text-center">
                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Cuotas extra</p>
                <p className="text-[10px] font-black text-slate-700">
                  +{preview.extraInstallments} cuotas de {fmt(loan.installmentValue)}
                  {preview.lastInstAmount > 0 && (
                    <span className="text-slate-400"> + 1 cuota de {fmt(preview.lastInstAmount)}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i>
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">La cuota diaria NO cambia</p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-[9px] font-black text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center uppercase tracking-widest">
              {error}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              id="penalty-cancel-btn"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              id="penalty-save-btn"
              onClick={handleSave}
              disabled={isSaving || !preview || preview.penaltyAmount <= 0}
              className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <><i className="fa-solid fa-circle-notch fa-spin"></i> Guardando...</>
              ) : (
                <><i className="fa-solid fa-bolt"></i> Aplicar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PenaltyModal;
