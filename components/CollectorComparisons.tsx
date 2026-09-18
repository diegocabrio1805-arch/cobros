import React, { useMemo } from 'react';
import { AppState, Role, CollectionLogType, LoanStatus } from '../types';
import { formatCurrency, calculateTotalPaidFromLogs, getDaysOverdue } from '../utils/helpers';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface CollectorComparisonsProps {
  state: AppState;
}

const CollectorComparisons: React.FC<CollectorComparisonsProps> = ({ state }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const data = useMemo(() => {
    const collectors = (Array.isArray(state.users) ? state.users : []).filter(u => u.role === Role.COLLECTOR);
    
    // Optimizaciones de cálculo (una sola pasada)
    const logsByLoanId = new Map<string, number>();
    const monthLogsByCollector = new Map<string, number>();
    const lastVisitMap = new Map<string, number>();

    state.collectionLogs.forEach(log => {
      if (log.deletedAt) return;
      
      const logDate = new Date(log.date || log.createdAt);
      const isPayment = (log.type === CollectionLogType.PAYMENT || String(log.type).toUpperCase() === 'PAGO') && !log.isOpening && !(log as any).is_opening;
      
      // Para pagos totales
      if (isPayment) {
        const loanId = log.loanId || log.loan_id;
        if (loanId) {
          const amt = typeof log.amount === 'number' ? log.amount : (parseFloat(String(log.amount).replace(/[^\d.-]/g, '')) || 0);
          logsByLoanId.set(loanId, (logsByLoanId.get(loanId) || 0) + amt);
        }
      }

      // Para última visita
      const cId = log.clientId || (log as any).client_id;
      if (cId) {
        const time = logDate.getTime();
        const current = lastVisitMap.get(cId) || 0;
        if (time > current) {
          lastVisitMap.set(cId, time);
        }
      }
    });

    // Calcular recaudación mensual
    state.collectionLogs.forEach(log => {
      if (log.deletedAt) return;
      const logDate = new Date(log.date || log.createdAt);
      if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
        const loan = state.loans.find(l => l.id === log.loanId);
        if (loan) {
          const cId = (loan.collectorId || (loan as any).collector_id);
          if (cId) {
            const isPayment = (log.type === CollectionLogType.PAYMENT || String(log.type).toUpperCase() === 'PAGO') && !log.isOpening && !(log as any).is_opening;
            if (isPayment) {
              const amt = typeof log.amount === 'number' ? log.amount : (parseFloat(String(log.amount).replace(/[^\d.-]/g, '')) || 0);
              monthLogsByCollector.set(cId, (monthLogsByCollector.get(cId) || 0) + amt);
            }
          }
        }
      }
    });

    const results = collectors.map(collector => {
      const uidLower = collector.id.toLowerCase();
      // Para coincidir con el Dashboard, agrupamos por CLIENTE, no por PRÉSTAMO individual
      const validClients = state.clients.filter(c => !c.isHidden && !c.deletedAt);
      const validClientsForCollector = validClients.filter(c => {
        const addedByLower = (c.addedBy || (c as any).added_by || '').toLowerCase();
        const activeLoan = state.loans.find(l => (l.clientId || (l as any).client_id) === c.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
        const anyHistoricLoan = state.loans.find(l => (l.clientId || (l as any).client_id) === c.id && (l.collectorId || (l as any).collector_id)?.toLowerCase() === uidLower);
        return addedByLower === uidLower || (activeLoan?.collectorId || (activeLoan as any)?.collector_id)?.toLowerCase() === uidLower || !!anyHistoricLoan;
      });

      let sanos = 0;
      let mora = 0;
      let abandonados = 0;
      let frozenCash = 0;
      let totalActive = 0;

      // Nuevas métricas solicitadas
      let totalPortfolioCapital = 0;
      let abandoned20DaysCapital = 0;
      let sanoCapital = 0;
      let moraCapital = 0;
      let cancelledCapital = 0;

      // Contadores de clientes para cada estado
      let sanoCapitalCount = 0;
      let moraCapitalCount = 0;
      let abandoned20CapitalCount = 0;
      let cancelledCapitalCount = 0;

      validClientsForCollector.forEach(c => {
        const clientLoans = state.loans.filter(l => (l.clientId || (l as any).client_id) === c.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
        
        let clientActiveBalance = 0;
        let maxDaysOverdue = 0;

        clientLoans.forEach(loan => {
           const paid = logsByLoanId.get(loan.id) || 0;
           const balance = Math.max(0, loan.totalAmount - paid);
           clientActiveBalance += balance;
           const overdue = getDaysOverdue(loan, state.settings, paid);
           if (overdue > maxDaysOverdue) maxDaysOverdue = overdue;
        });

        if (clientActiveBalance > 0.01) {
          totalActive++;
          totalPortfolioCapital += clientActiveBalance;

          const lastVisitTime = lastVisitMap.get(c.id);
          
          let isAbandoned10 = false;
          let isAbandoned20 = false;

          if (!lastVisitTime) {
            isAbandoned10 = true;
            isAbandoned20 = true;
          } else {
            const diffDays = Math.abs(new Date().getTime() - lastVisitTime) / (1000 * 60 * 60 * 24);
            if (diffDays > 10) isAbandoned10 = true;
            if (diffDays > 20) isAbandoned20 = true;
          }

          // Distribución mututamente exclusiva del capital activo (Alineada 100% con Dashboard)
          if (isAbandoned10) { // Usamos 10 días exactos para igualar la métrica de Abandono del Dashboard
            abandoned20DaysCapital += clientActiveBalance;
            abandoned20CapitalCount++;
          } else if (maxDaysOverdue > 35) { // En Dashboard, Mora es > 35 días
            moraCapital += clientActiveBalance;
            moraCapitalCount++;
          } else {
            sanoCapital += clientActiveBalance;
            sanoCapitalCount++;
          }

          // Para conteo del BarChart original y Score (mantiene abandonado>10 original)
          if (isAbandoned10) {
            abandonados++;
            frozenCash += clientActiveBalance;
          } else if (maxDaysOverdue > 35) {
            mora++;
            frozenCash += clientActiveBalance;
          } else {
            sanos++;
          }
        } else {
          // Cliente totalmente Cancelado
          cancelledCapitalCount++;
          
          const allClientLoans = state.loans.filter(l => (l.clientId || (l as any).client_id) === c.id);
          allClientLoans.forEach(loan => {
            const paid = logsByLoanId.get(loan.id) || 0;
            const balance = Math.max(0, loan.totalAmount - paid);
            if (balance <= 0.01) {
              cancelledCapital += loan.totalAmount;
            }
          });
        }
      });

      const collectedThisMonth = monthLogsByCollector.get(collector.id) || monthLogsByCollector.get(uidLower) || 0;
      const moraRate = totalActive > 0 ? (mora / totalActive) * 100 : 0;
      
      const score = (collectedThisMonth / 100000) - (moraRate * 2) - (abandonados * 10);

      return {
        id: collector.id,
        name: collector.name,
        collectedThisMonth,
        sanos,
        mora,
        abandonados,
        frozenCash,
        totalActive,
        moraRate,
        score,
        totalPortfolioCapital,
        abandoned20DaysCapital,
        moraCapital,
        sanoCapital,
        cancelledCapital,
        sanoCapitalCount,
        moraCapitalCount,
        abandoned20CapitalCount,
        cancelledCapitalCount
      };
    });

    return results;
  }, [state.users, state.loans, state.collectionLogs, state.clients, currentMonth, currentYear]);

  if (data.length === 0) return null;

  // Filtrar cobradores válidos para los premios (que tengan al menos 1 cliente activo o hayan recaudado algo)
  const validData = data.filter(d => d.totalActive > 0 || d.collectedThisMonth > 0);
  
  if (validData.length === 0) return null;

  // Ordenar del mejor al peor según el score
  const sortedData = [...validData].sort((a, b) => b.score - a.score);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs font-bold border border-slate-700 z-50">
          <p className="text-blue-400 mb-1">{payload[0].name}</p>
          <p>{formatCurrency(payload[0].value, state.settings)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-slate-50/50 p-6 rounded-xl border border-slate-200 mb-8 space-y-8 relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <i className="fa-solid fa-scale-unbalanced text-lg"></i>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Balance de Capital por Cobrador</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Desglose financiero de la cartera asignada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
        {sortedData.map((collector, index) => {
          let badge = '';
          let badgeClass = '';
          
          if (index === 0) {
            badge = '👑 MVP';
            badgeClass = 'bg-yellow-400 text-yellow-900 border-yellow-500';
          } else if (collector.moraRate < 15 && collector.abandonados < 5) {
            badge = '⭐ Excelente';
            badgeClass = 'bg-emerald-500 text-white border-emerald-600';
          } else if (collector.moraRate < 25) {
            badge = '✅ Bueno';
            badgeClass = 'bg-blue-500 text-white border-blue-600';
          } else if (collector.moraRate < 40) {
            badge = '⚠️ Regular';
            badgeClass = 'bg-orange-400 text-white border-orange-500';
          } else {
            badge = '🚨 Crítico';
            badgeClass = 'bg-red-500 text-white border-red-600';
          }

          return (
          <div key={collector.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all flex flex-col relative">
            {/* Rank Number */}
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg z-10 border-b border-l border-slate-700">
              #{index + 1}
            </div>

            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-col gap-1 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-slate-800 text-white flex items-center justify-center font-black text-sm border border-slate-700 shrink-0">
                  {collector.name.charAt(0)}
                </div>
                <h3 className="text-sm font-black text-white uppercase truncate pr-6">{collector.name}</h3>
              </div>
              <div className="flex justify-end w-full">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeClass} shadow-sm`}>
                  {badge}
                </span>
              </div>
            </div>
            
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs shadow-sm border border-slate-200">{collector.totalActive}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><i className="fa-solid fa-sack-dollar text-slate-300"></i> Capital Total</span>
                </div>
                <span className="text-xs font-black text-slate-700">{formatCurrency(collector.totalPortfolioCapital, state.settings)}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs shadow-sm border border-emerald-200">{collector.sanoCapitalCount}</span>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1.5"><i className="fa-solid fa-money-bill-wave text-emerald-300"></i> Que se mueve (Sano)</span>
                </div>
                <span className="text-xs font-black text-emerald-600">{formatCurrency(collector.sanoCapital, state.settings)}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs shadow-sm border border-orange-200">{collector.moraCapitalCount}</span>
                  <span className="text-[10px] font-bold text-orange-500 uppercase flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-orange-300"></i> En Mora</span>
                </div>
                <span className="text-xs font-black text-orange-600">{formatCurrency(collector.moraCapital, state.settings)}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center font-black text-xs shadow-sm border border-red-200">{collector.abandoned20CapitalCount}</span>
                  <span className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1.5"><i className="fa-solid fa-triangle-exclamation text-red-300"></i> Abandonado &gt;10d</span>
                </div>
                <span className="text-xs font-black text-red-600">{formatCurrency(collector.abandoned20DaysCapital, state.settings)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center font-black text-xs shadow-sm border border-purple-200">{collector.cancelledCapitalCount}</span>
                  <span className="text-[10px] font-bold text-purple-500 uppercase flex items-center gap-1.5"><i className="fa-solid fa-check-double text-purple-300"></i> Cancelado (Histórico)</span>
                </div>
                <span className="text-xs font-black text-purple-600">{formatCurrency(collector.cancelledCapital, state.settings)}</span>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Gráfico 3D Recaudación */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-black text-slate-800 uppercase w-full text-center mb-2">📊 Cuota de Recaudación del Mes</h3>
          <p className="text-[10px] text-slate-400 uppercase font-bold text-center mb-4 w-full">¿Quién mueve más efectivo en la empresa?</p>
          <div className="w-full h-64 relative drop-shadow-2xl">
            {/* Efecto 3D CSS: el drop-shadow sobre el SVG genera la ilusión esférica en recharts */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.25))' }}>
                <Pie
                  data={data.filter(d => d.collectedThisMonth > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="collectedThisMonth"
                  stroke="none"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                >
                  {data.filter(d => d.collectedThisMonth > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Barras: Mora vs Sanos vs Abandonados */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-black text-slate-800 uppercase w-full text-center mb-2">⚖️ Calidad de Cartera (Cant. Clientes)</h3>
          <p className="text-[10px] text-slate-400 uppercase font-bold text-center mb-4 w-full">Sanos vs Mora vs Abandonos por Cobrador</p>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={validData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  interval={0}
                  tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sanos" name="Sanos (Al Día)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="mora" name="En Mora" stackId="a" fill="#f43f5e" />
                <Bar dataKey="abandonados" name="Abandonados" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectorComparisons;
