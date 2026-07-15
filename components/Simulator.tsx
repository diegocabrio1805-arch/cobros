import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Frequency, AppSettings, AppState, Role, SimulatedOrder, LoanStatus } from '../types';
import { calculateTotalReturn, generateAmortizationTable, formatCurrency, formatDate, getLocalDateStringForCountry } from '../utils/helpers';
import { getTranslation } from '../utils/translations';
import { v4 as uuidv4 } from 'uuid';
import { addToSyncQueue } from '../utils/syncQueue';

interface SimulatorProps {
   settings?: AppSettings;
   state?: AppState;
}

const Simulator: React.FC<SimulatorProps> = ({ settings, state }) => {
   const [principal, setPrincipal] = useState<string>('500000');
   const [interestRate, setInterestRate] = useState<string>('20');
   const [installments, setInstallments] = useState<string>('24');
   const [frequency, setFrequency] = useState<Frequency>(Frequency.DAILY);
   
   const [simulationDate, setSimulationDate] = useState<string>(getLocalDateStringForCountry(settings?.country || 'CO'));
   const [selectedClientId, setSelectedClientId] = useState<string>('');
   const [clientSearch, setClientSearch] = useState<string>('');
   const [showClientDropdown, setShowClientDropdown] = useState(false);
   const [orders, setOrders] = useState<SimulatedOrder[]>([]);
   const dropdownRef = useRef<HTMLDivElement>(null);

   const trans = getTranslation(settings?.language || 'es');
   const t = trans.simulator;

   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowClientDropdown(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   useEffect(() => {
      loadOrders();
   }, []);



   const simulation = useMemo(() => {
      const p = Number(principal) || 0;
      const i = Number(interestRate) || 0;
      const inst = Number(installments) || 0;

      const totalAmount = calculateTotalReturn(p, i);
      const installmentValue = inst > 0 ? totalAmount / inst : 0;
      const startDate = simulationDate;
      const table = generateAmortizationTable(
         p,
         i,
         inst,
         frequency,
         startDate,
         settings?.country || 'CO',
         [] // No hay feriados personalizados en simulador por ahora
      );
      return { totalAmount, installmentValue, profit: totalAmount - p, table };
   }, [principal, interestRate, installments, frequency, simulationDate]);

   const visibleClients = useMemo(() => {
      if (!state || !state.currentUser) return [];
      const clients = Array.isArray(state.clients) ? state.clients : [];
      if (state.currentUser.role === Role.ADMIN || state.currentUser.role === Role.MANAGER) {
         return clients.filter(c => !c.isHidden && !c.deletedAt);
      } else {
         const uid = state.currentUser.id.toLowerCase();
         return clients.filter(c => {
            if (c.isHidden || c.deletedAt) return false;
            const addedBy = (c.addedBy || '').toLowerCase();
            const hasLoanWithCol = (Array.isArray(state.loans) ? state.loans : []).some(l => 
               l.clientId === c.id && (l.collectorId || '').toLowerCase() === uid
            );
            return addedBy === uid || hasLoanWithCol;
         });
      }
   }, [state]);

   const filteredClients = useMemo(() => {
      if (!clientSearch.trim()) return visibleClients.slice(0, 50);
      return visibleClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 50);
   }, [visibleClients, clientSearch]);

   const handleCargarPedido = () => {
      if (!selectedClientId) {
         alert("Debe seleccionar un cliente para crear el pedido.");
         return;
      }
      const client = visibleClients.find(c => c.id === selectedClientId);
      if (!client) return;

      const order: SimulatedOrder = {
         id: uuidv4(),
         clientId: client.id,
         clientName: client.name,
         principal: Number(principal),
         interestRate: Number(interestRate),
         installments: Number(installments),
         totalAmount: simulation.totalAmount,
         installmentValue: simulation.installmentValue,
         frequency: frequency,
         simulationDate: simulationDate,
         endDate: simulation.table.length > 0 ? simulation.table[simulation.table.length - 1].dueDate : simulationDate,
         createdAt: new Date().toISOString(),
         table: simulation.table,
         collectorId: state?.currentUser?.id,
         branchId: state?.currentUser?.role === Role.ADMIN || state?.currentUser?.role === Role.MANAGER ? state.currentUser.id : state?.currentUser?.managedBy
      };

      addToSyncQueue({
         operation: 'ADD_SIMULATED_ORDER',
         data: order
      });
      const event = new CustomEvent('force-sync');
      window.dispatchEvent(event);
      alert("Pedido cargado exitosamente y enviado a sincronización.");

      // Reset fields
      setPrincipal('0');
      setInterestRate('0');
      setInstallments('0');
      setClientSearch('');
      setSelectedClientId('');
   };

   return (
      <div className="space-y-4 md:space-y-6 animate-fadeIn pb-20 px-1">
         <div className="bg-white p-5 md:p-6 rounded-none border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-center md:text-left w-full md:w-auto">
               <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center justify-center md:justify-start gap-3">
                  <i className="fa-solid fa-calculator text-blue-600"></i>
                  {t.title}
               </h2>
               <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.subtitle}</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
               <div className="bg-white p-6 md:p-8 rounded-none border border-slate-100 shadow-xl relative overflow-hidden">
                  <h3 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-tighter mb-5 md:mb-6">{t.params}</h3>

                  <div className="space-y-4 md:space-y-5">
                     
                     {/* Búsqueda de Clientes */}
                     <div ref={dropdownRef} className="space-y-1.5 relative z-[60]">
                        <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente a Simular</label>
                        <div className="relative">
                           <input 
                              type="text" 
                              placeholder="Buscar cliente..." 
                              value={selectedClientId ? visibleClients.find(c => c.id === selectedClientId)?.name || clientSearch : clientSearch}
                              onChange={(e) => {
                                 setClientSearch(e.target.value);
                                 setSelectedClientId('');
                                 setShowClientDropdown(true);
                              }}
                              onFocus={() => setShowClientDropdown(true)}
                              className="w-full px-3 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-none font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-sm uppercase"
                           />
                           {selectedClientId && (
                              <button onClick={() => { setSelectedClientId(''); setClientSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                 <i className="fa-solid fa-times"></i>
                              </button>
                           )}
                        </div>
                        {showClientDropdown && !selectedClientId && (
                           <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 shadow-lg rounded-none">
                              {filteredClients.map(c => (
                                 <div 
                                    key={c.id} 
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer font-bold text-xs text-slate-700 uppercase"
                                    onClick={() => {
                                       setSelectedClientId(c.id);
                                       setClientSearch(c.name);
                                       setShowClientDropdown(false);
                                    }}
                                 >
                                    {c.name}
                                 </div>
                              ))}
                              {filteredClients.length === 0 && <div className="px-3 py-2 text-xs text-slate-400 italic">No hay resultados</div>}
                           </div>
                        )}
                     </div>

                     {/* Fecha */}
                     <div className="space-y-1.5">
                        <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Inicio</label>
                        <input
                           type="date"
                           value={simulationDate}
                           onChange={(e) => setSimulationDate(e.target.value)}
                           className="w-full px-3 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-none font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-sm"
                        />
                     </div>

                     <div>
                        <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t.principal || 'Capital'}</label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                           <input
                              type="text"
                              value={principal}
                              onChange={(e) => setPrincipal(e.target.value)}
                              className="w-full pl-8 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-none font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base md:text-lg shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-1.5">
                           <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.interest || 'Int %'}</label>
                           <input
                              type="text"
                              value={interestRate}
                              onChange={(e) => setInterestRate(e.target.value)}
                              className="w-full px-3 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-none font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-center shadow-inner text-sm"
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.installments || 'Cuotas'}</label>
                           <input
                              type="text"
                              value={installments}
                              onChange={(e) => setInstallments(e.target.value)}
                              className="w-full px-3 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-none font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-center shadow-inner text-sm"
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t.frequency || 'Frecuencia'}</label>
                        <div className="grid grid-cols-2 gap-2">
                           {Object.values(Frequency).map((freq) => (
                              <button
                                 key={freq}
                                 onClick={() => setFrequency(freq)}
                                 className={`py-2.5 rounded-none text-[8px] md:text-[9px] font-black uppercase tracking-wider transition-all border-2 ${frequency === freq ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 active:border-blue-200'}`}
                              >{(trans as any).clients?.registrationForm?.frequencies?.[freq] || freq}</button>
                           ))}
                        </div>
                     </div>
                     
                     <div className="pt-2">
                        <button
                           onClick={handleCargarPedido}
                           className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] md:text-sm uppercase tracking-widest transition-all rounded-none shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                           <i className="fa-solid fa-save"></i> CARGAR PEDIDO
                        </button>
                     </div>

                  </div>
               </div>

               <div className="bg-[#0f172a] p-6 md:p-8 rounded-none shadow-xl text-white relative overflow-hidden">
                  <div className="relative z-10 text-center md:text-left">
                     <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.profit || 'Utilidad Estimada'}</p>
                     <p className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">{formatCurrency(simulation.profit, settings)}</p>
                  </div>
                  <i className="fa-solid fa-chart-line absolute -bottom-2 -right-2 text-6xl md:text-8xl text-white/5 pointer-events-none"></i>
               </div>
            </div>

            <div className="lg:col-span-2 space-y-4 md:space-y-6">
               <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-none p-5 md:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-20 hidden md:block">
                     <i className="fa-solid fa-money-bill-wave text-9xl"></i>
                  </div>
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center text-center md:text-left">
                     <div>
                        <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1 md:mb-2">{t.installmentValue || 'Cuota Estimada'}</p>
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter font-mono">{formatCurrency(simulation.installmentValue, settings)}</h2>
                        <span className="inline-block mt-2 md:mt-3 px-3 py-1 bg-white/20 rounded-none text-[8px] md:text-[10px] font-bold uppercase tracking-wider">
                           {(trans as any).clients?.registrationForm?.frequencies?.[frequency] || frequency}
                        </span>
                     </div>
                     <div className="space-y-3 md:space-y-4 md:border-l md:border-white/10 md:pl-8 text-center md:text-left border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                        <div>
                           <p className="text-[8px] md:text-[10px] font-black text-blue-200 uppercase tracking-widest">{t.totalPay || 'Monto Total'}</p>
                           <p className="text-lg md:text-2xl font-black font-mono">{formatCurrency(simulation.totalAmount, settings)}</p>
                        </div>
                        <div>
                           <p className="text-[8px] md:text-[10px] font-black text-blue-200 uppercase tracking-widest">{t.endDate || 'Finaliza'}</p>
                           <p className="text-base md:text-xl font-black uppercase">{simulation.table.length > 0 ? formatDate(simulation.table[simulation.table.length - 1].dueDate) : '---'}</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white rounded-none border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[350px] md:h-[500px]">
                  <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center sticky top-0 z-10">
                     <h3 className="text-[10px] md:text-sm font-black text-slate-800 uppercase tracking-wide">{t.plan || 'Amortización Preliminar'}</h3>
                     <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase bg-white px-3 py-1 rounded-none border border-slate-100 shadow-sm">
                        {simulation.table.length} {t.installments || 'Cuotas'}
                     </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
                     <div className="space-y-2">
                        {simulation.table.map((inst) => (
                           <div key={inst.number} className="flex items-center justify-between p-3 md:p-4 bg-white border border-slate-100 rounded-none hover:border-blue-200 transition-colors group">
                              <div className="flex items-center gap-3 md:gap-4">
                                 <div className="w-7 h-7 md:w-8 md:h-8 rounded-none bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[10px] md:text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    {inst.number}
                                 </div>
                                 <div>
                                    <p className="text-[9px] md:text-xs font-black text-slate-700 uppercase">{formatDate(inst.dueDate)}</p>
                                 </div>
                              </div>
                              <p className="text-[11px] md:sm font-black text-slate-800 font-mono">{formatCurrency(inst.amount, settings)}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>


      </div>
   );
};

export default Simulator;
