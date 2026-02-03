import React, { useEffect, useState, useMemo } from 'react';
import { AppState, CollectionLogType, Role, LoanStatus, PaymentStatus } from '../types';
import { formatCurrency, getLocalDateStringForCountry } from '../utils/helpers';
import { getFinancialInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getTranslation } from '../utils/translations';

interface DashboardProps {
  state: AppState;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const t = getTranslation(state.settings.language).dashboard;
  const isAdmin = state.currentUser?.role === Role.ADMIN || state.currentUser?.role === Role.MANAGER;

  // Hoy según país
  const countryTodayStr = getLocalDateStringForCountry(state.settings.country);

  useEffect(() => {
    const fetchInsights = async () => {
      if (state.loans.length === 0 || loadingInsights) return;
      setLoadingInsights(true);
      try {
        const data = await getFinancialInsights(state);
        setInsights(data);
      } catch (e) {
        console.error("Error al obtener insights:", e);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [state.loans.length]);

  const totalPrincipal = (state.loans || []).reduce((acc, l) => acc + l.principal, 0);
  const totalProfit = (state.loans || []).reduce((acc, l) => acc + (l.totalAmount - l.principal), 0);
  const totalExpenses = (state.expenses || []).reduce((acc, e) => acc + e.amount, 0);
  const netUtility = totalProfit - totalExpenses;

  const collectedToday = (state.payments || [])
    .filter(p => {
      const pDateStr = new Date(p.date).toISOString().split('T')[0];
      return pDateStr === countryTodayStr;
    })
    .reduce((acc, p) => acc + p.amount, 0);

  const collectorStats = useMemo(() => {
    if (!isAdmin) return [];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // Filter users to show in stats.
    // Show only COLLECTORS (exclude managers and admins from route audit)
    return (state.users || []).filter(u => {
      // Only show collectors, not managers or admins
      return u.role === Role.COLLECTOR;
    }).map(user => {
      const logsToday = (state.collectionLogs || []).filter(log => {
        const loan = (state.loans || []).find(l => l.id === log.loanId);
        const logDateStr = new Date(log.date).toISOString().split('T')[0];
        return loan?.collectorId === user.id && logDateStr === countryTodayStr;
      });

      const recaudoHoy = logsToday
        .filter(l => l.type === CollectionLogType.PAYMENT)
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);

      const uniqueClientsVisitedToday = new Set(logsToday.map(l => l.clientId)).size;
      const assignedActiveLoans = state.loans.filter(l => l.collectorId === user.id && l.status === LoanStatus.ACTIVE);
      const totalClientsCount = new Set(assignedActiveLoans.map(l => l.clientId)).size;

      const overdueLoansCount = assignedActiveLoans.filter(loan => {
        return (loan.installments || []).some(inst =>
          inst.status !== PaymentStatus.PAID &&
          new Date(inst.dueDate) < todayDate
        );
      }).length;

      const financialMoraRate = totalClientsCount > 0 ? (overdueLoansCount / totalClientsCount) * 100 : 0;
      const routeCompletionRate = totalClientsCount > 0 ? (uniqueClientsVisitedToday / totalClientsCount) * 100 : 0;
      const isRouteCompleted = totalClientsCount > 0 && uniqueClientsVisitedToday >= totalClientsCount;

      return {
        id: user.id,
        name: user.name,
        recaudo: recaudoHoy,
        financialMora: financialMoraRate,
        routeCompletion: routeCompletionRate,
        clientes: totalClientsCount,
        visitados: uniqueClientsVisitedToday,
        isCompleted: isRouteCompleted,
        overdueCount: overdueLoansCount
      };
    });
  }, [state.users, state.collectionLogs, state.loans, state.clients, isAdmin, countryTodayStr]);

  const totalPages = Math.ceil(collectorStats.length / ITEMS_PER_PAGE);
  const paginatedCollectors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return collectorStats.slice(start, start + ITEMS_PER_PAGE);
  }, [collectorStats, currentPage]);

  const chartData = [
    { name: 'Capital Inv.', value: totalPrincipal, color: '#6366f1' },
    { name: 'Ingresos', value: totalProfit, color: '#10b981' },
    { name: 'Gastos', value: totalExpenses, color: '#f43f5e' },
    { name: 'Utilidad', value: netUtility, color: '#3b82f6' },
  ];

  return (
    <div className="space-y-4 animate-fadeIn pb-24 max-w-[1600px] mx-auto">
      {/* CABECERA SUPERIOR - Más compacta */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Resumen Operativo <span className="text-[10px] text-emerald-500 font-bold ml-2">v5.3.4 FINAL STABLE</span></h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-emerald-500"></i>
            Panel de Control Principal
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
          <i className="fa-solid fa-calendar-day text-emerald-400 text-xs"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">
            {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES (KPIs) - Altura reducida */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Utilidad Neta', value: formatCurrency(netUtility, state.settings), icon: 'fa-vault', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Capital Prestado', value: formatCurrency(totalPrincipal, state.settings), icon: 'fa-money-bill-transfer', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: 'Intereses Proy.', value: formatCurrency(totalProfit, state.settings), icon: 'fa-arrow-up-right-dots', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Recaudo de Hoy', value: formatCurrency(collectedToday, state.settings), icon: 'fa-hand-holding-dollar', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-4 rounded-2xl border ${stat.border} shadow-sm hover:shadow-md transition-all group overflow-hidden relative`}>
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-10 h-10 shrink-0 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform`}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
              <div className="min-w-0">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">{stat.label}</p>
                <p className={`text-xs md:text-sm font-black text-slate-800 font-mono tracking-tighter`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CONTENEDOR CENTRAL: AUDITORÍA ESTILO EXCEL */}
      {isAdmin && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-table-list text-blue-600"></i>
                Auditoría de Rutas
              </h3>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-20 transition-all"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest px-2 border-x border-slate-100">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-20 transition-all"
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[900px]">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest sticky top-0 z-20">
                    <th className="px-5 py-3 border-r border-white/10 w-1/4">Cobrador / Ruta</th>
                    <th className="px-5 py-3 border-r border-white/10 text-center w-[15%]">Recaudo Hoy</th>
                    <th className="px-5 py-3 border-r border-white/10 text-center w-[12%]">Ind. Mora</th>
                    <th className="px-5 py-3 border-r border-white/10 w-[30%]">Progreso Visitas</th>
                    <th className="px-5 py-3 text-center w-[18%]">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCollectors.map((stat) => (
                    <tr key={stat.id} className="hover:bg-blue-50/20 transition-colors group text-[10px] font-bold">
                      <td className="px-5 py-3 border-r border-slate-100 bg-white group-hover:bg-blue-50/5">
                        <p className="text-slate-900 font-black uppercase truncate tracking-tight">{stat.name}</p>
                        <p className="text-[7px] text-blue-500 font-black uppercase tracking-widest mt-0.5">{stat.clientes} Clientes</p>
                      </td>
                      <td className="px-5 py-3 border-r border-slate-100 text-center font-mono font-black text-emerald-600 bg-slate-50/20">
                        {formatCurrency(stat.recaudo, state.settings)}
                      </td>
                      <td className="px-5 py-3 border-r border-slate-100 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black font-mono border ${stat.financialMora > 30 ? 'bg-red-50 text-red-600 border-red-100' :
                          stat.financialMora > 10 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                          {Math.round(stat.financialMora)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                            <div
                              className={`h-full transition-all duration-1000 ${stat.isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.max(5, stat.routeCompletion)}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-black text-slate-500 w-10 text-right">
                            {stat.visitados}/{stat.clientes}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {stat.isCompleted ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[7px] font-black uppercase flex items-center justify-center gap-1">
                            <i className="fa-solid fa-check-double"></i> CERRADA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-[7px] font-black uppercase flex items-center justify-center gap-1">
                            <i className="fa-solid fa-clock"></i> {stat.clientes - stat.visitados} PEND.
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN INFERIOR: GRÁFICOS E INSIGHTS IA - Altura Optimizada */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* GRÁFICO DE RENDIMIENTO - Achicado */}
        <div className="lg:col-span-7 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-chart-column text-indigo-500"></i>
              Métricas Mensuales
            </h3>
            <span className="text-[7px] font-black text-slate-400 uppercase">Datos Proyectados</span>
          </div>

          <div className="h-[250px] w-full mt-auto relative bg-slate-50/30 rounded-2xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 8, fill: '#94a3b8' }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                  contentStyle={{
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                  }}
                  formatter={(value: number) => formatCurrency(value, state.settings)}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ANÁLISIS IA - Achicado y más directo */}
        <div className="lg:col-span-5 bg-[#0f172a] p-5 rounded-[2rem] shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <i className="fa-solid fa-microchip text-7xl text-indigo-400"></i>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-100 leading-none">Consultoría IA</h3>
                <p className="text-[7px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Auditoría 24/7</p>
              </div>
            </div>

            {loadingInsights ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
                <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Escaneando...</p>
              </div>
            ) : insights ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[8px] uppercase font-black text-slate-400">Riesgo</p>
                  <span className={`text-[9px] font-black px-3 py-0.5 rounded-full border ${insights.riskLevel === 'Bajo' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    insights.riskLevel === 'Medio' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                    {insights.riskLevel?.toUpperCase()}
                  </span>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[8px] font-black text-indigo-400 uppercase mb-2 tracking-widest">
                    <i className="fa-solid fa-quote-left mr-1"></i> ESTRATEGIA
                  </p>
                  <p className="text-[10px] text-slate-300 leading-tight font-medium italic">
                    "{insights.summary}"
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {(insights.recommendations || []).slice(0, 2).map((rec: string, i: number) => (
                      <div key={i} className="flex gap-2 text-[9px] text-slate-200 bg-white/5 p-2 rounded-lg border border-white/5 items-center">
                        <i className="fa-solid fa-bolt-lightning text-amber-400 text-[8px]"></i>
                        <span className="font-bold leading-none truncate">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center opacity-20 border border-dashed border-white/10 rounded-2xl">
                <p className="text-[8px] font-black uppercase">Sin datos de análisis</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[7px] font-black uppercase text-indigo-500">
            <span>Powered by Gemini 3.0</span>
            <i className="fa-solid fa-sparkles animate-pulse"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;