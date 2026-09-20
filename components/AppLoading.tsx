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
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');

        .ac-logo-wrapper {
          text-align: center;
          margin-bottom: 36px;
        }
        .ac-logo-title {
          font-family: 'Orbitron', monospace;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 6px;
          text-transform: uppercase;
          color: #e0f0ff;
          line-height: 1;
        }
        .ac-logo-title span {
          color: #00bfff;
          text-shadow: 0 0 18px rgba(0,191,255,0.7), 0 0 40px rgba(0,191,255,0.3);
        }
        .ac-logo-sub {
          font-family: 'Orbitron', monospace;
          font-size: 9px;
          letter-spacing: 8px;
          color: rgba(0,191,255,0.35);
          margin-top: 8px;
          text-transform: uppercase;
        }
        .ac-divider {
          width: 200px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #00bfff55, transparent);
          margin: 12px auto 0;
        }
        .ac-loading-text {
          font-family: 'Orbitron', monospace;
          color: #4da6ff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 8px;
          margin-bottom: 18px;
        }
        .ac-bar {
          width: 280px;
          height: 34px;
          border: 1.5px solid #0066cc;
          display: flex;
          padding: 3px;
          gap: 2px;
          box-sizing: border-box;
        }
        .ac-seg {
          flex: 1;
          height: 100%;
          background: #00bfff;
          opacity: 0.15;
        }
        @keyframes seg-pulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* LOGO */}
      <div className="ac-logo-wrapper">
        <div className="ac-logo-title">
          ANEXO<span>COBRO</span>
        </div>
        <div className="ac-divider" />
        <div className="ac-logo-sub">Sistema Core</div>
      </div>

      {/* LOADING */}
      <div className="ac-loading-text">LOADING...</div>

      {/* BARRA SEGMENTADA */}
      <div className="ac-bar">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="ac-seg"
            style={{ animation: `seg-pulse 1.4s ease-in-out ${i * 0.07}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
};

export default AppLoading;
