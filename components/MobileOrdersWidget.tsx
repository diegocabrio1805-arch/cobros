import React, { useState, useEffect } from 'react';
import { addToSyncQueue } from '../utils/syncQueue';
import { AppState, SimulatedOrder, LoanStatus, Role } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';

interface MobileOrdersWidgetProps {
  state: AppState;
  onCloseMenu?: () => void;
}

const MobileOrdersWidget: React.FC<MobileOrdersWidgetProps> = ({ state, onCloseMenu }) => {
  const [orders, setOrders] = useState<SimulatedOrder[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const isPowerUser = state.currentUser?.role === Role.ADMIN || state.currentUser?.role === Role.MANAGER;

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
    
    // Unir locales (prioridad) con los de la nube y filtrar duplicados/eliminados
    const combined = [...localAdds, ...cloudOrders];
    const uniqueOrders: SimulatedOrder[] = [];
    const seenIds = new Set<string>();
    
    for (const order of combined) {
      if (!seenIds.has(order.id) && !localDeletes.has(order.id)) {
        seenIds.add(order.id);
        uniqueOrders.push(order);
      }
    }
    
    const allOrders: SimulatedOrder[] = uniqueOrders;

    const currentUserId = state.currentUser?.id;

    const activeClientsMap = new Map();
    (Array.isArray(state.loans) ? state.loans : []).forEach(l => {
      if (l.status !== LoanStatus.PAID) {
        activeClientsMap.set(l.clientId || (l as any).client_id, l.collectorId || (l as any).collector_id);
      }
    });
    
    const filteredOrders = allOrders.filter(o => {
      if (isPowerUser) return true;
      const orderCollectorId = o.collectorId || (o as any).collector_id;
      if (orderCollectorId) {
          return orderCollectorId === currentUserId;
      }
      
      // Fallback a derivarlo del cliente solo si el pedido no tiene collectorId
      const loanCollector = activeClientsMap.get(o.clientId);
      const client = (Array.isArray(state.clients) ? state.clients : []).find(c => c.id === o.clientId);
      const collectorId = loanCollector || (client ? (client.addedBy || (client as any).added_by) : null);

      return collectorId === currentUserId;
    });

    setOrders(filteredOrders);
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
    <div className="col-span-2 mt-2 mb-6 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-fadeIn">
       <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-3 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors select-none"
       >
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
             <i className="fa-solid fa-list-check text-emerald-500"></i> Pedidos Pendientes
          </h3>
          <div className="flex items-center gap-2.5">
             <span className="bg-emerald-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">{orders.length}</span>
             <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-400 text-xs transition-transform duration-250`}></i>
          </div>
       </div>
       {isExpanded && (
          <div className="flex flex-col max-h-[500px] overflow-y-auto custom-scrollbar bg-white animate-fadeIn">
             {orders.map(order => (
                <div key={order.id} className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                   <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-slate-800 uppercase truncate leading-tight">{order.clientName}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Inicio: {formatDate(order.simulationDate)}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-mono font-black text-slate-700">{formatCurrency(order.principal, state.settings)}</span>
                         <i className="fa-solid fa-arrow-right text-[8px] text-slate-300"></i>
                         <span className="text-[10px] font-mono font-black text-emerald-600">{formatCurrency(order.totalAmount, state.settings)}</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex flex-col items-end">
                         <span className="text-[9px] font-mono font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {formatCurrency(order.installmentValue, state.settings)}
                         </span>
                         <span className="text-[7.5px] font-bold text-slate-500 uppercase mt-1">
                            {order.installments} x {order.frequency.split(' ')[0]}
                         </span>
                      </div>
                      {isPowerUser && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                         >
                            <i className="fa-solid fa-trash text-[10px]"></i>
                         </button>
                      )}
                   </div>
                </div>
             ))}
          </div>
       )}
    </div>
  );
};

export default MobileOrdersWidget;
