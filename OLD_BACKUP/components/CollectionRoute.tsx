
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, CollectionLog, CollectionLogType, PaymentStatus, Role, LoanStatus } from '../types';
import { formatCurrency, generateReceiptText, getDaysOverdue, getLocalDateStringForCountry } from '../utils/helpers';
import { getTranslation } from '../utils/translations';
import { generateNoPaymentAIReminder } from '../services/geminiService';
// Import Capacitor to detect platform
import { Capacitor } from '@capacitor/core';
import { printText, connectToPrinter } from '../services/bluetoothPrinterService';

interface CollectionRouteProps {
  state: AppState;
  addCollectionAttempt: (log: CollectionLog) => void;
  deleteCollectionLog?: (logId: string) => void;
}

const CollectionRoute: React.FC<CollectionRouteProps> = ({ state, addCollectionAttempt, deleteCollectionLog }) => {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [isVirtualProcessing, setIsVirtualProcessing] = useState(false);
  const [isRenewalProcessing, setIsRenewalProcessing] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdminOrManager = state.currentUser?.role === Role.ADMIN || state.currentUser?.role === Role.MANAGER;
  const currentUserId = state.currentUser?.id;
  const [selectedCollectorFilter, setSelectedCollectorFilter] = useState<string>(isAdminOrManager ? 'all' : (currentUserId || ''));

  const countryTodayStr = getLocalDateStringForCountry(state.settings.country);

  const [startDate, setStartDate] = useState<string>(countryTodayStr);
  const [endDate, setEndDate] = useState<string>(countryTodayStr);

  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  const t = getTranslation(state.settings.language);

  const isViewingToday = useMemo(() => {
    return startDate === countryTodayStr && endDate === countryTodayStr;
  }, [startDate, endDate, countryTodayStr]);

  const routeLoans = useMemo(() => {
    let loans = state.loans.filter(l => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.PAID || l.status === LoanStatus.DEFAULT);
    if (selectedCollectorFilter !== 'all') {
      loans = loans.filter(l => l.collectorId === selectedCollectorFilter);
    }
    return loans;
  }, [state.loans, selectedCollectorFilter]);

  const enrichedRoute = useMemo(() => {
    const parseLocal = (s: string) => {
      if (!s) return new Date();
      const parts = s.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    const startLimit = parseLocal(startDate);
    startLimit.setHours(0, 0, 0, 0);
    const endLimit = parseLocal(endDate);
    endLimit.setHours(23, 59, 59, 999);

    return routeLoans.map(loan => {
      const client = state.clients.find(c => c.id === loan.clientId);
      const rangeLogs = state.collectionLogs.filter(log => {
        const logDate = new Date(log.date);
        return log.loanId === loan.id && logDate >= startLimit && logDate <= endLimit;
      });

      const totalPaidInRange = rangeLogs
        .filter(log => log.type === CollectionLogType.PAYMENT)
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);

      const hasNoPayReport = rangeLogs.some(log => log.type === CollectionLogType.NO_PAGO);
      const collector = state.users.find(u => u.id === loan.collectorId);

      return {
        ...loan,
        client,
        collectorName: collector?.name || 'Admin',
        paidPeriod: totalPaidInRange,
        visitedNoPayment: hasNoPayReport,
        dailyBalance: isViewingToday ? Math.max(0, loan.installmentValue - totalPaidInRange) : 0
      };
    }).filter(item => {
      if (!isViewingToday) {
        return item.paidPeriod > 0 || item.visitedNoPayment;
      }
      return item.status !== LoanStatus.PAID || item.paidPeriod > 0;
    });
  }, [routeLoans, state.collectionLogs, state.clients, startDate, endDate, isViewingToday, state.users]);

  const filteredRoute = useMemo(() => {
    if (!searchTerm) return enrichedRoute;
    const s = searchTerm.toLowerCase();
    return enrichedRoute.filter(item =>
      item.client?.name.toLowerCase().includes(s) ||
      item.client?.address.toLowerCase().includes(s)
    );
  }, [enrichedRoute, searchTerm]);

  const totalCollectedInView = useMemo(() => {
    return filteredRoute.reduce((acc, curr) => acc + curr.paidPeriod, 0);
  }, [filteredRoute]);

  const totalPages = Math.ceil(filteredRoute.length / ITEMS_PER_PAGE);
  const paginatedRoute = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRoute.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRoute, currentPage]);

  const resetUI = () => {
    setReceipt(null);
    setSelectedClient(null);
    setIsProcessing(false);
    setIsVirtualProcessing(false);
    setIsRenewalProcessing(false);
    setAmount(0);
  };

  const handleOpenPayment = (clientId: string, loan: any) => {
    if (!isViewingToday) return;
    setSelectedClient(clientId);
    setAmount(Math.max(0, loan.installmentValue - (loan.paidPeriod || 0)));
    setIsVirtualProcessing(false);
    setIsRenewalProcessing(false);
  };

  const triggerPrintTicket = async (receiptText: string) => {
    // 1. Native APK Printing (Bluetooth)
    if (Capacitor.isNativePlatform()) {
      try {
        // Attempt to print directly (service handles internal connection state)
        const success = await printText(receiptText);

        // If it fails (likely not connected yet), try to connect once then print
        if (!success) {
          const connected = await connectToPrinter();
          if (connected) {
            await printText(receiptText);
          } else {
            alert('No se pudo conectar a la impresora. Verifique que esté encendida y configurada.');
          }
        }
      } catch (e) {
        console.error("Printing error:", e);
        alert('Error al imprimir: ' + e);
      }
      return;
    }

    // 2. Web Printing (Iframe)
    const iframeId = 'print-frame-route';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;

    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
            <html>
            <head>
                <style>
                    body { font-family: monospace; white-space: pre-wrap; padding: 20px; font-size: 12px; margin: 0; }
                    @page { margin: 0; }
                </style>
            </head>
            <body>\${receiptText}</body>
            <script>
               window.onload = function() {
                  window.print();
               }
            </script>
            </html>
        `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 500);
    }
  };

  const setMethodInRoute = (method: 'cash' | 'virtual' | 'renewal') => {
    setIsVirtualProcessing(method === 'virtual');
    setIsRenewalProcessing(method === 'renewal');

    if (method === 'renewal' && selectedClient) {
      const loan = enrichedRoute.find(l => l.clientId === selectedClient);
      if (loan) {
        const totalPaid = loan.installments.reduce((acc: number, i: any) => acc + (i.paidAmount || 0), 0);
        setAmount(Math.max(0, loan.totalAmount - totalPaid));
      }
    } else {
      const loan = enrichedRoute.find(l => l.clientId === selectedClient);
      if (loan) {
        setAmount(Math.max(0, loan.installmentValue - (loan.paidPeriod || 0)));
      }
    }
  };

  const handleAction = async (clientId: string, loanId: string, type: CollectionLogType, customAmount?: number, isVirtual: boolean = false, isRenewal: boolean = false) => {
    console.log("handleAction called", { clientId, loanId, type }); // Debug log
    // Force allow processing if it was stuck, or provide feedback if truly busy
    // Force allow processing if it was stuck, or provide feedback if truly busy
    if (isProcessing) {
      console.warn("Action blocked: isProcessing is true");
      // Resetting it just in case it got stuck
      setIsProcessing(false);
    }

    // Explicit Confirmation for User
    /* alert("Procesando pago... Por favor espere."); */ // Uncomment if needed for extreme debugging

    setIsProcessing(true);
    try {
      const amountToApply = customAmount || amount;

      if (type === CollectionLogType.PAYMENT && (!amountToApply || amountToApply <= 0)) {
        alert("Monto inválido");
        setIsProcessing(false);
        return;
      }
      const logId = Math.random().toString(36).substr(2, 9);
      const now = new Date();

      const log: CollectionLog = {
        id: logId,
        clientId,
        loanId,
        type,
        amount: type === CollectionLogType.PAYMENT ? amountToApply : 0,
        date: now.toISOString(),
        location: { lat: 0, lng: 0 }, // Default safe location
        isVirtual,
        isRenewal
      };

      // 1. Core Logic: Add to State
      addCollectionAttempt(log);
      // alert("✅ Pago registrado correctamente."); // Removed for production smooth flow



      // 2. Receipt Generation & Printing
      const client = state.clients.find(c => c.id === clientId);

      if (client && type === CollectionLogType.PAYMENT) {
        try {
          console.log("Generating receipt...");
          // Safe access to loan for receipt
          const loan = state.loans.find(l => l.id === loanId);
          const totalPaidOnLoan = (loan?.installments?.reduce((acc, inst) => acc + (inst.paidAmount || 0), 0) || 0) + amountToApply;

          // Mock installments if missing
          const installmentsSafe = loan?.installments || [];
          const lastInst = installmentsSafe.length > 0 ? installmentsSafe[installmentsSafe.length - 1] : { dueDate: '' };
          const paidCount = installmentsSafe.filter(i => i.status === PaymentStatus.PAID).length;

          const receiptText = generateReceiptText({
            clientName: client.name,
            amountPaid: amountToApply,
            loanId,
            startDate: loan?.createdAt || now.toISOString(),
            expiryDate: lastInst.dueDate || '',
            daysOverdue: loan ? getDaysOverdue(loan) : 0,
            remainingBalance: Math.max(0, (loan?.totalAmount || 0) - totalPaidOnLoan),
            paidInstallments: paidCount + 1,
            totalInstallments: loan?.totalInstallments || 0,
            isRenewal
          }, state.settings);

          setReceipt(receiptText);

          // Non-blocking print
          triggerPrintTicket(receiptText).catch(err => console.error("Print error ignored:", err));

          // Non-blocking WA
          const phone = client.phone.replace(/\D/g, '');
          // Only open whatsapp if valid phone, don't block
          if (phone.length >= 7) {
            // window.open... commented to avoid popup blocker issues during debug, optional
          }
        } catch (receiptError) {
          console.error("Error generating receipt visuals:", receiptError);
          alert("Pago registrado, pero hubo un error generando el recibo visual.");
        }
      } else if (client && type === CollectionLogType.NO_PAGO) {
        // No pay logic
        resetUI();
      }

    } catch (e: any) {
      console.error("Critical Error in handleAction:", e);
      alert("Error Crítico al Registrar: " + (e.message || e));
      resetUI();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteHistoryPayment = (loanId: string) => {
    const parseLocal = (s: string) => {
      const parts = s.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };
    const startLimit = parseLocal(startDate);
    startLimit.setHours(0, 0, 0, 0);
    const endLimit = parseLocal(endDate);
    endLimit.setHours(23, 59, 59, 999);

    const targetLogs = state.collectionLogs
      .filter(l => l.loanId === loanId && l.type === CollectionLogType.PAYMENT)
      .filter(l => {
        const d = new Date(l.date);
        return d >= startLimit && d <= endLimit;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (targetLogs.length > 0) {
      if (confirm(`¿ELIMINAR ESTE PAGO POR \${formatCurrency(targetLogs[0].amount || 0, state.settings)}?`)) {
        deleteCollectionLog?.(targetLogs[0].id);
      }
    } else {
      alert("No hay pagos para este crédito en el rango seleccionado.");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 pb-32 animate-fadeIn px-1 md:px-0">
      <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 \${isViewingToday ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-500/20'} rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl`}>
              <i className={`fa-solid \${isViewingToday ? 'fa-route' : 'fa-clock-rotate-left'} text-lg md:text-xl`}></i>
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-tighter truncate">Planilla de Ruta</h2>
              <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest truncate">
                {selectedCollectorFilter === 'all' ? 'CONSOLIDADO' : state.users.find(u => u.id === selectedCollectorFilter)?.name.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {isAdminOrManager && (
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 shadow-inner">
                <i className="fa-solid fa-user-gear text-emerald-600 text-[10px]"></i>
                <select
                  value={selectedCollectorFilter}
                  onChange={(e) => setSelectedCollectorFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-[9px] font-black text-black uppercase tracking-widest cursor-pointer w-full focus:ring-0"
                >
                  <option value="all">TODAS LAS RUTAS</option>
                  {state.users.filter(u => u.id === currentUserId || u.managedBy === currentUserId).map(u => (
                    <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-inner">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[9px] font-black text-black outline-none uppercase w-full" />
              <span className="text-slate-400 font-bold">-</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[9px] font-black text-black outline-none uppercase w-full" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full border-t border-slate-100 pt-3 md:pt-4">
          <div className="relative w-full">
            <input type="text" placeholder="Filtrar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner text-black" />
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] md:text-xs"></i>
          </div>
          <div className="bg-slate-900 px-5 md:px-6 py-3 rounded-xl md:rounded-2xl border border-slate-800 flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end shrink-0 shadow-xl w-full md:w-auto">
            <span className="text-[7px] font-black text-slate-500 uppercase md:mb-0.5">Recaudo</span>
            <span className="text-base md:text-lg font-black text-emerald-400 font-mono leading-none">{formatCurrency(totalCollectedInView, state.settings)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto mobile-scroll-container">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-[8px] md:text-[9px] font-black uppercase border-b border-slate-200">
                <th className="px-3 md:px-4 py-4">Cliente</th>
                <th className="px-3 md:px-4 py-4 text-center">Base</th>
                <th className="px-3 md:px-4 py-4 text-center bg-emerald-50/50">Abono</th>
                <th className="px-3 md:px-4 py-4 text-center">Estatus</th>
                <th className="px-3 md:px-4 py-4 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRoute.map((item) => (
                <tr key={item.id} className={`hover:bg-slate-50/80 transition-all \${item.paidPeriod > 0 ? 'bg-emerald-50/10' : ''}`}>
                  <td className="px-3 md:px-4 py-4">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-tighter truncate max-w-[150px]">{item.client?.name}</p>
                    <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest mt-0.5 truncate">{item.client?.address}</p>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center font-mono text-[9px] md:text-[10px] text-slate-500">{formatCurrency(item.installmentValue, state.settings)}</td>
                  <td className={`px-3 md:px-4 py-4 text-center font-black font-mono text-[10px] md:text-[11px] \${item.paidPeriod > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {item.paidPeriod > 0 ? formatCurrency(item.paidPeriod, state.settings) : '-'}
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center font-bold text-[9px] md:text-[10px]">
                    {isViewingToday ? (
                      <span className={`font-mono \${item.dailyBalance > 0 ? 'text-red-500' : 'text-emerald-400'}`}>{item.dailyBalance > 0 ? formatCurrency(item.dailyBalance, state.settings) : 'AL DÍA'}</span>
                    ) : (
                      <span className={`text-[7px] md:text-[8px] font-black uppercase px-2 py-1 rounded-md \${item.paidPeriod > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{item.paidPeriod > 0 ? 'Cobro' : 'No Pago'}</span>
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {isViewingToday ? (
                        item.paidPeriod === 0 && !item.visitedNoPayment ? (
                          <button onClick={() => handleOpenPayment(item.clientId, item)} className="px-4 py-3 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase active:scale-95 transition-all shadow-md">Abonar</button>
                        ) : (
                          <div className="flex gap-1.5">
                            <span className={`text-[7px] md:text-[8px] font-black uppercase px-2 py-2 rounded-lg flex items-center \${item.paidPeriod > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{item.paidPeriod > 0 ? 'RECIBIDO' : 'MORA'}</span>
                            {isAdminOrManager && (
                              <>
                                <button onClick={() => handleOpenPayment(item.clientId, item)} className="w-9 h-9 text-blue-500 bg-white border border-blue-100 rounded-lg flex items-center justify-center shadow-sm active:scale-90"><i className="fa-solid fa-plus-circle"></i></button>
                                {item.paidPeriod > 0 && (
                                  <button onClick={() => handleDeleteHistoryPayment(item.id)} className="w-9 h-9 text-red-500 bg-white border border-red-100 rounded-lg flex items-center justify-center shadow-sm active:scale-90"><i className="fa-solid fa-trash-can"></i></button>
                                )}
                              </>
                            )}
                          </div>
                        )
                      ) : (
                        isAdminOrManager && item.paidPeriod > 0 && (
                          <button onClick={() => handleDeleteHistoryPayment(item.id)} className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100 active:scale-90 transition-all shadow-sm">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 py-6">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 disabled:opacity-30 active:scale-90 shadow-sm"><i className="fa-solid fa-chevron-left"></i></button>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">{currentPage} de {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 disabled:opacity-30 active:scale-90 shadow-sm"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-2">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm p-6 text-center animate-scaleIn border border-white/20">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl border border-emerald-100">
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
            <h3 className="text-base font-black text-slate-800 mb-4 uppercase tracking-tighter">Registrar Abono</h3>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <button onClick={() => setMethodInRoute('cash')} className={`py-3 rounded-lg text-[8px] font-black uppercase border transition-all \${!isVirtualProcessing && !isRenewalProcessing ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 active:bg-slate-100'}`}>Efectivo</button>
              <button onClick={() => setMethodInRoute('virtual')} className={`py-3 rounded-lg text-[8px] font-black uppercase border transition-all \${isVirtualProcessing ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 active:bg-slate-100'}`}>Transf.</button>
              <button onClick={() => setMethodInRoute('renewal')} className={`py-3 rounded-lg text-[8px] font-black uppercase border transition-all \${isRenewalProcessing ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 active:bg-slate-100'}`}>Liquidar</button>
            </div>

            <div className="relative mb-6">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
              <input type="number" autoFocus value={amount === 0 ? '' : amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full pl-12 pr-5 py-8 text-3xl font-black bg-slate-50 rounded-2xl text-center outline-none border-2 border-transparent focus:border-emerald-500 transition-all text-slate-900 shadow-inner" placeholder="0" />
            </div>
            <div className="space-y-2">
              <button onClick={() => {
                try {
                  const item = enrichedRoute.find(l => l.clientId === selectedClient);
                  if (item) {
                    handleAction(selectedClient, item.id, CollectionLogType.PAYMENT, amount, isVirtualProcessing, isRenewalProcessing);
                  } else {
                    alert("Error: No se encontró el crédito activo para este cliente.");
                    console.error("Item not found for client:", selectedClient);
                  }
                } catch (e) {
                  console.error("Critical error in button click:", e);
                  alert("Error crítico al procesar: " + e);
                }
              }} className="w-full font-black py-5 bg-emerald-600 text-white rounded-xl shadow-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">Confirmar e Imprimir</button>
              <button onClick={resetUI} className="w-full py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[210] p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] p-6 text-center max-w-sm w-full animate-scaleIn shadow-2xl">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-xl border border-green-200"><i className="fa-solid fa-check-double"></i></div>
            <h3 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tighter">¡Gestión Exitosa!</h3>
            <div className="bg-slate-50 p-4 rounded-xl font-mono text-[9px] text-left mb-6 max-h-40 overflow-y-auto border border-slate-200 text-black font-black shadow-inner whitespace-pre-wrap">{receipt}</div>
            <button onClick={resetUI} className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Cerrar y Continuar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionRoute;
