
import React, { useState, useMemo } from 'react';
import { Frequency, AppSettings } from '../types';
import { calculateTotalReturn, generateAmortizationTable, formatCurrency, formatDate } from '../utils/helpers';
import { getTranslation } from '../utils/translations';

interface SimulatorProps {
  settings?: AppSettings;
}

const Simulator: React.FC<SimulatorProps> = ({ settings }) => {
  const [principal, setPrincipal] = useState<string>('500000');
  const [interestRate, setInterestRate] = useState<string>('20');
  const [installments, setInstallments] = useState<string>('24');
  const [frequency, setFrequency] = useState<Frequency>(Frequency.DAILY);
  const t = getTranslation('es').simulator;

  const simulation = useMemo(() => {
    const p = Number(principal) || 0;
    const i = Number(interestRate) || 0;
    const inst = Number(installments) || 0;
    
    const totalAmount = calculateTotalReturn(p, i);
    const installmentValue = inst > 0 ? totalAmount / inst : 0;
    const table = generateAmortizationTable(
      p,
      i,
      inst,
      frequency,
      new Date()
    );
    return { totalAmount, installmentValue, profit: totalAmount - p, table };
  }, [principal, interestRate, installments, frequency]);

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn pb-20 px-1">
      <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
           <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
              <h3 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-tighter mb-5 md:mb-6">{t.params}</h3>
              
              <div className="space-y-4 md:space-y-5">
                 <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Capital</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                       <input 
                         type="text" 
                         value={principal}
                         onChange={(e) => setPrincipal(e.target.value)}
                         className="w-full pl-8 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base md:text-lg shadow-inner"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                        <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Int %</label>
                        <input 
                          type="text" 
                          value={interestRate}
                          onChange={(e) => setInterestRate(e.target.value)}
                          className="w-full px-3 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-center shadow-inner text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cuotas</label>
                        <input 
                          type="text" 
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className="w-full px-3 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-center shadow-inner text-sm"
                        />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Frecuencia</label>
                    <div className="grid grid-cols-2 gap-2">
                       {Object.values(Frequency).map((freq) => (
                          <button
                             key={freq}
                             onClick={() => setFrequency(freq)}
                             className={`py-2.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-wider transition-all border-2 ${frequency === freq ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 active:border-blue-200'}`}
                          >
                             {freq}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-[#0f172a] p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
               <div className="relative z-10 text-center md:text-left">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilidad Estimada</p>
                  <p className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">{formatCurrency(simulation.profit, settings)}</p>
               </div>
               <i className="fa-solid fa-chart-line absolute -bottom-2 -right-2 text-6xl md:text-8xl text-white/5 pointer-events-none"></i>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-4 md:space-y-6">
           <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-20 hidden md:block">
                 <i className="fa-solid fa-money-bill-wave text-9xl"></i>
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center text-center md:text-left">
                 <div>
                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1 md:mb-2">Cuota Estimada</p>
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter font-mono">{formatCurrency(simulation.installmentValue, settings)}</h2>
                    <span className="inline-block mt-2 md:mt-3 px-3 py-1 bg-white/10 rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                       {frequency}
                    </span>
                 </div>
                 <div className="space-y-3 md:space-y-4 md:border-l md:border-white/10 md:pl-8 text-center md:text-left border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                    <div>
                       <p className="text-[8px] md:text-[10px] font-black text-blue-200 uppercase tracking-widest">Monto Total</p>
                       <p className="text-lg md:text-2xl font-black font-mono">{formatCurrency(simulation.totalAmount, settings)}</p>
                    </div>
                    <div>
                       <p className="text-[8px] md:text-[10px] font-black text-blue-200 uppercase tracking-widest">Finaliza</p>
                       <p className="text-base md:text-xl font-black uppercase">{simulation.table.length > 0 ? formatDate(simulation.table[simulation.table.length - 1].dueDate) : '---'}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[350px] md:h-[500px]">
              <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center sticky top-0 z-10">
                 <h3 className="text-[10px] md:text-sm font-black text-slate-800 uppercase tracking-wide">Amortización Preliminar</h3>
                 <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                    {simulation.table.length} Cuotas
                 </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
                 <div className="space-y-2">
                    {simulation.table.map((inst) => (
                       <div key={inst.number} className="flex items-center justify-between p-3 md:p-4 bg-white border border-slate-100 rounded-xl md:rounded-2xl hover:border-blue-200 transition-colors group">
                          <div className="flex items-center gap-3 md:gap-4">
                             <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[10px] md:text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
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
