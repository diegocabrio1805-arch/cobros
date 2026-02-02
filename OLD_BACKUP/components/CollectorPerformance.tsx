
import React, { useMemo } from 'react';
import { AppState, Role, CollectionLogType, PaymentStatus, LoanStatus } from '../types';
import { formatCurrency } from '../utils/helpers';
import { getTranslation } from '../utils/translations';

interface CollectorPerformanceProps {
  state: AppState;
}

const CollectorPerformance: React.FC<CollectorPerformanceProps> = ({ state }) => {
  const collectors = state.users.filter(u => u.role === Role.COLLECTOR);
  const t = getTranslation(state.settings.language);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const getMonthlyStats = (collectorId: string) => {
    // 1. Préstamos activos asignados a este cobrador
    const collectorLoans = state.loans.filter(l => l.collectorId === collectorId);
    const assignedClientIds = new Set(collectorLoans.filter(l => l.status === LoanStatus.ACTIVE).map(l => l.clientId));
    const totalActiveClients = assignedClientIds.size;

    // 2. Logs de gestión de este mes
    const monthlyLogs = state.collectionLogs.filter(log => {
      const logDate = new Date(log.date);
      const isCollector = collectorLoans.some(l => l.id === log.loanId);
      return isCollector && 
             logDate.getMonth() === currentMonth && 
             logDate.getFullYear() === currentYear;
    });

    // 3. Clientes visitados este mes
    const visitedClientIds = new Set(monthlyLogs.map(log => log.clientId));
    const clientsVisited = Array.from(visitedClientIds).filter(id => assignedClientIds.has(id)).length;
    
    // 4. Dinero Recaudado este mes
    const collectedThisMonth = monthlyLogs
      .filter(log => log.type === CollectionLogType.PAYMENT)
      .reduce((acc, log) => acc + (log.amount || 0), 0);

    // 5. Dinero No Recaudado (Cartera vencida o pendiente de este mes)
    // Calculamos la suma de las cuotas que vencían este mes y no se han pagado
    let moneyNotCollected = 0;
    collectorLoans.filter(l => l.status !== LoanStatus.PAID).forEach(loan => {
      loan.installments.forEach(inst => {
        const dueDate = new Date(inst.dueDate);
        if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
          if (inst.status !== PaymentStatus.PAID) {
            moneyNotCollected += (inst.amount - inst.paidAmount);
          }
        }
      });
    });

    const coverage = totalActiveClients > 0 ? (clientsVisited / totalActiveClients) * 100 : 0;
    const allVisited = totalActiveClients > 0 && clientsVisited >= totalActiveClients;

    return {
      collectedThisMonth,
      moneyNotCollected,
      totalActiveClients,
      clientsVisited,
      coverage,
      allVisited
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
             <i className="fa-solid fa-chart-pie text-blue-600"></i>
             {t.menu.performance}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Análisis de Gestión Mensual</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="text-right">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Periodo Actual</p>
             <p className="text-xs font-black text-slate-800 uppercase">
                {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
             </p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
             <i className="fa-solid fa-calendar-check"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {collectors.length === 0 ? (
          <div className="py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
            <i className="fa-solid fa-user-tag text-5xl mb-4 opacity-20"></i>
            <p className="text-lg font-bold">No hay cobradores para auditar.</p>
          </div>
        ) : (
          collectors.map(collector => {
            const stats = getMonthlyStats(collector.id);
            
            return (
              <div key={collector.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
                <div className="p-8 flex flex-col lg:flex-row gap-8 items-center">
                  {/* Perfil y Cobertura */}
                  <div className="w-full lg:w-1/4 flex flex-col items-center text-center space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-8">
                    <div className="relative">
                      <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-2xl transition-transform group-hover:scale-110 duration-500">
                        {collector.name.charAt(0)}
                      </div>
                      {stats.allVisited && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-bounce">
                           <i className="fa-solid fa-check text-xs"></i>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{collector.name}</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cobrador de Ruta</p>
                    </div>
                    <div className="w-full space-y-2">
                       <div className="flex justify-between items-end">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Cobertura de Visitas</p>
                          <p className={`text-xs font-black ${stats.allVisited ? 'text-emerald-500' : 'text-blue-600'}`}>{Math.round(stats.coverage)}%</p>
                       </div>
                       <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${stats.allVisited ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                            style={{ width: `${stats.coverage}%` }}
                          />
                       </div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">
                          {stats.clientsVisited} de {stats.totalActiveClients} clientes activos visitados
                       </p>
                    </div>
                  </div>

                  {/* Métricas Financieras Mensuales */}
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
                     <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 flex flex-col justify-between group-hover:bg-emerald-50 transition-colors">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                           <i className="fa-solid fa-money-bill-trend-up"></i>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Recaudado este mes</p>
                           <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.collectedThisMonth)}</p>
                        </div>
                     </div>

                     <div className="p-6 bg-red-50/50 rounded-[2rem] border border-red-100 flex flex-col justify-between group-hover:bg-red-50 transition-colors">
                        <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
                           <i className="fa-solid fa-hand-holding-dollar"></i>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">No recaudado (Mes)</p>
                           <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.moneyNotCollected)}</p>
                        </div>
                     </div>

                     <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex flex-col justify-between relative overflow-hidden group-hover:shadow-2xl transition-all duration-500">
                        <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                           <i className="fa-solid fa-star text-amber-400"></i>
                        </div>
                        <div className="relative z-10">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Efectividad Total</p>
                           <p className="text-2xl font-black text-white tracking-tighter">
                              {stats.collectedThisMonth > 0 ? Math.round((stats.collectedThisMonth / (stats.collectedThisMonth + stats.moneyNotCollected)) * 100) : 0}%
                           </p>
                        </div>
                        <i className="fa-solid fa-award absolute -right-4 -bottom-4 text-7xl text-white/5"></i>
                     </div>
                  </div>

                  {/* Status Final */}
                  <div className="w-full lg:w-48 flex flex-col gap-3">
                     <div className={`p-4 rounded-2xl border text-center ${stats.allVisited ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitas Completas</p>
                        <p className={`text-xs font-black uppercase ${stats.allVisited ? 'text-emerald-600' : 'text-slate-400'}`}>
                           {stats.allVisited ? 'SÍ, CUMPLIÓ' : 'PENDIENTE'}
                        </p>
                     </div>
                     <button className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                        DETALLE COMPLETO
                     </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CollectorPerformance;
