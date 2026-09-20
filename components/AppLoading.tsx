import React from 'react';

const AppLoading: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f172a', // Fondo oscuro simple
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div className="text-white font-black text-2xl tracking-widest uppercase">
        ANEXO COBRO
      </div>
    </div>
  );
};

export default AppLoading;
