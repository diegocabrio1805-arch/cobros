import React from 'react';

const AppLoading: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div className="flex flex-col items-center">
        <div className="text-6xl mb-4">💼</div>
        <div className="text-white font-black text-2xl tracking-widest uppercase mb-1">
          ANEXO COBRO
        </div>
        <div className="text-slate-400 font-bold text-xs tracking-widest uppercase mb-6">
          SISTEMA CORE
        </div>
        <div className="text-emerald-400 font-mono text-sm tracking-widest animate-pulse">
          CARGANDO...
        </div>
      </div>
    </div>
  );
};

export default AppLoading;
