import React, { useState, useEffect } from 'react';
import { addToSyncQueue } from '../utils/syncQueue';
import { AppState, SimulatedOrder, LoanStatus, Role } from '../types';
import { formatCurrency, formatDate, formatLocalTime, calculateTotalPaidFromLogs, getLocalDateStringForCountry } from '../utils/helpers';
import { getTranslation } from '../utils/translations';

interface MobileOrdersWidgetProps {
  state: AppState;
  onCloseMenu?: () => void;
}

const MobileOrdersWidget: React.FC<MobileOrdersWidgetProps> = ({ state, onCloseMenu }) => {
  const [orders, setOrders] = useState<SimulatedOrder[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const isPowerUser = state.currentUser?.role === Role.ADMIN || state.currentUser?.role === Role.MANAGER;

  const getClientBalance = (clientId: string) => {
    const clientLoans = (Array.isArray(state.loans) ? state.loans : []).filter(
      l => (l.clientId || (l as any).client_id) === clientId && 
           (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT)
    );
    if (clientLoans.length === 0) return 0;
    let totalBalance = 0;
    for (const loan of clientLoans) {
      const totalPaid = calculateTotalPaidFromLogs(loan, state.collectionLogs || []);
      totalBalance += Math.max(0, loan.totalAmount - totalPaid);
    }
    return totalBalance;
  };

  const loadOrders = () => {
    const cloudOrders = state.simulatedOrders || [];
    const queueStr = localStorage.getItem('syncQueue');
    let localAdds: SimulatedOrder[] = [];
    let localDeletes = new Set<string>();
    
    if (queueStr) {
      try {
        const queue = JSON.parse(queueStr);
        localAdds = queue.filter((q: any) => q.operation === 'ADD_SIMULATED_ORDER').map((q: any) => q.data);
        localDeletes = new Set(queue.filter((q: any) => q.operation === 'DELETE_SIMULATED_ORDER').map((q: any) => q.data.id));
      } catch (e) {}
    }
    
    const combined = [...localAdds, ...cloudOrders];
    
    // Auto-cleanup orders: past days OR negative "efec a entregar" (balance exceeds principal)
    const countryTodayStr = getLocalDateStringForCountry(state.settings.country || 'PY');
    const expiredOrders = combined.filter(order => {
      if (localDeletes.has(order.id)) return false;
      if (order.simulationDate < countryTodayStr) return true;
      const balance = getClientBalance(order.clientId);
      if (order.principal - balance < 0) return true;
      return false;
    });

    if (expiredOrders.length > 0) {
      expiredOrders.forEach(order => {
        addToSyncQueue({ operation: 'DELETE_SIMULATED_ORDER', data: { id: order.id } });
      });
      setTimeout(() => {
        const event = new CustomEvent('force-sync');
        window.dispatchEvent(event);
      }, 0);
    }

    const uniqueOrders: SimulatedOrder[] = [];
    const seenIds = new Set<string>();
    
    for (const order of combined) {
      const balance = getClientBalance(order.clientId);
      const isNegative = order.principal - balance < 0;
      if (!seenIds.has(order.id) && !localDeletes.has(order.id) && order.simulationDate >= countryTodayStr && !isNegative) {
        seenIds.add(order.id);
        uniqueOrders.push(order);
      }
    }
    
    setOrders(uniqueOrders);
  };

  useEffect(() => {
    loadOrders();
    const handleForceSync = () => loadOrders();
    window.addEventListener('force-sync', handleForceSync);
    return () => window.removeEventListener('force-sync', handleForceSync);
  }, [state.loans, state.clients, state.currentUser, state.simulatedOrders]);

  const handleDeleteOrder = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este pedido?")) {
      addToSyncQueue({ operation: 'DELETE_SIMULATED_ORDER', data: { id } });
      const event = new CustomEvent('force-sync');
      window.dispatchEvent(event);
      loadOrders();
    }
  };

  if (orders.length === 0) return null;

  return (
    <div className="col-span-2 mt-2 mb-4">
      {/* TRIGGER BUTTON (COMPACT AND PREMIUM) */}
      <button 
         onClick={() => setIsExpanded(true)}
         className="w-full bg-[#0055a5] hover:bg-[#004485] text-white rounded-2xl border border-[#004485]/50 p-4 flex items-center justify-between shadow-lg transition-all active:scale-98"
      >
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
               <i className="fa-solid fa-list-check text-sm animate-pulse"></i>
            </div>
            <div className="flex flex-col items-start text-left leading-tight">
               <span className="text-[10px] font-black uppercase tracking-wider">Pedidos Pendientes</span>
               <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Toca para abrir persiana</span>
            </div>
         </div>
         <span className="bg-emerald-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">
            {orders.length}
         </span>
      </button>

      {/* BOTTOM SHEET / PERSIANA (PORTAL-LIKE OVERLAY) */}
      {isExpanded && (
         <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[1050] flex flex-col justify-start items-center pt-6 px-3 animate-fadeInFast">
            {/* Click backdrop to close */}
            <div className="absolute inset-0 -z-10" onClick={() => setIsExpanded(false)}></div>
            
            {/* Sheet Content */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl animate-slideUp overflow-hidden">
               {/* Drag Handle Bar */}
               <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 cursor-pointer" onClick={() => setIsExpanded(false)}></div>
               
               {/* Header */}
               <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                     <i className="fa-solid fa-list-check text-emerald-500 text-sm"></i>
                     <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        Pedidos Pendientes
                     </h3>
                     <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-1">{orders.length}</span>
                  </div>
                  <button 
                     onClick={() => setIsExpanded(false)}
                     className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  >
                     <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
               </div>

               {/* Table Content (Excel Style) */}
               <div className="flex-1 overflow-auto rounded-xl border border-slate-800/80 bg-slate-950/40 custom-scrollbar mb-2">
                  <table className="w-full text-left border-collapse text-xs">
                     <thead>
                        <tr className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                           <th className="px-2.5 py-2 border-r border-slate-800/60 whitespace-nowrap">Cliente</th>
                           <th className="px-2.5 py-2 border-r border-slate-800/60 whitespace-nowrap">Registro</th>
                           <th className="px-2.5 py-2 border-r border-slate-800/60 whitespace-nowrap">Entrega</th>
                           <th className="px-2.5 py-2 border-r border-slate-800/60 text-right whitespace-nowrap">Monto</th>
                           <th className="px-2.5 py-2 border-r border-slate-800/60 text-right whitespace-nowrap">Saldo</th>
                            <th className="px-2.5 py-2 border-r border-slate-800/60 text-right whitespace-nowrap">Efec a Entregar</th>
                           <th className="px-2.5 py-2 border-r border-slate-800/60 text-right whitespace-nowrap">Cuota</th>
                           <th className="px-2.5 py-2 border-r border-slate-800/60 text-center whitespace-nowrap">Frecuencia</th>
                           {isPowerUser && <th className="px-2.5 py-2 text-center whitespace-nowrap">Acción</th>}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-850 text-slate-200">
                        {orders.map((order, idx) => {
                           const balance = getClientBalance(order.clientId);
                           return (
                              <tr key={order.id} className={`${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-950/20'} hover:bg-slate-900/60 transition-colors`}>
                                 <td className="px-2.5 py-2 font-bold uppercase truncate max-w-[130px] border-r border-slate-855 whitespace-nowrap">{order.clientName}</td>
                                 <td className="px-2.5 py-2 border-r border-slate-855">
                                    {order.createdAt ? (
                                        <div className="flex flex-col items-start leading-none text-xs">
                                           <span className="whitespace-nowrap text-slate-200">{formatDate(order.createdAt)}</span>
                                           <span className="whitespace-nowrap text-xs text-blue-400 mt-1 font-bold">{formatLocalTime(order.createdAt, state.settings?.country || 'PY')}</span>
                                        </div>
                                     ) : '---'}
                                 </td>
                                 <td className="px-2.5 py-2 text-[11px] border-r border-slate-855 whitespace-nowrap">{formatDate(order.simulationDate)}</td>
                                 <td className="px-2.5 py-2 font-mono font-bold text-right border-r border-slate-855 text-slate-300 whitespace-nowrap">{formatCurrency(order.principal, state.settings)}</td>
                                 <td className={`px-2.5 py-2 font-mono font-bold text-right border-r border-slate-855 whitespace-nowrap ${balance > 0 ? 'text-amber-500 font-black' : 'text-slate-400'}`}>
                                    {formatCurrency(balance, state.settings)}
                                 </td>

                                 <td className="px-2.5 py-2 font-mono font-bold text-right border-r border-slate-855 whitespace-nowrap">
                                     {order.principal - balance < 0 ? (
                                        <span className="text-emerald-500 font-bold uppercase text-[10px]">Crédito Nuevo</span>
                                     ) : (
                                        <span className="text-slate-300">{formatCurrency(order.principal - balance, state.settings)}</span>
                                     )}
                                  </td>
                                 <td className="px-2.5 py-2 font-mono font-bold text-right border-r border-slate-855 text-blue-400 whitespace-nowrap">{formatCurrency(order.installmentValue, state.settings)}</td>
                                 <td className="px-2.5 py-2 text-center uppercase text-[11px] border-r border-slate-855 whitespace-nowrap">
                                    {((getTranslation(state.settings.language) as any).clients?.registrationForm?.frequencies?.[order.frequency]) || order.frequency}
                                 </td>
                                 {isPowerUser && (
                                    <td className="px-2.5 py-2 text-center whitespace-nowrap">
                                       <button 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                          className="w-5 h-5 rounded bg-rose-950/50 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center transition-colors mx-auto"
                                       >
                                          <i className="fa-solid fa-trash text-[9px]"></i>
                                       </button>
                                    </td>
                                 )}
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

      {/* Embedded slideUp and fadeIn animations */}
      <style>{`
         @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
         }
         @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
         }
         .animate-slideUp {
            animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
         }
         .animate-fadeInFast {
            animation: fadeIn 0.25s ease-out forwards;
         }
         .divide-slate-850 > :not([hidden]) ~ :not([hidden]) {
            border-color: rgba(30, 41, 59, 0.5);
         }
         .border-slate-855 {
            border-color: rgba(30, 41, 59, 0.4);
         }
      `}</style>
    </div>
  );
};

export default MobileOrdersWidget;
