import React from 'react';

// Spinner de carga liviano: usa SOLO CSS animations, sin intervals ni estados.
const AppLoading: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1a2a4a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <style>{`
        .ac-logo-wrapper {
          text-align: center;
          margin-bottom: 24px;
        }
        .ac-logo-title {
          font-family: 'Orbitron', monospace;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #e0f0ff;
          line-height: 1;
        }
        .ac-logo-title span {
          color: #00bfff;
        }
        .ac-logo-sub {
          font-family: 'Orbitron', monospace;
          font-size: 9px;
          letter-spacing: 6px;
          color: rgba(0,191,255,0.4);
          margin-top: 8px;
          text-transform: uppercase;
        }
        .ac-loading-text {
          font-family: 'Orbitron', monospace;
          color: #4da6ff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 6px;
          animation: fade 1.5s ease-in-out infinite alternate;
        }
        @keyframes fade {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* LOGO */}
      <div className="ac-logo-wrapper">
        <div className="ac-logo-title">
          ANEXO<span>COBRO</span>
        </div>
        <div className="ac-logo-sub">Sistema Core</div>
      </div>

      {/* LOADING SIMPLE */}
      <div className="ac-loading-text">CARGANDO...</div>
    </div>
  );
};

export default AppLoading;
