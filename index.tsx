
// --- CRITICAL ERROR TRAP ---
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    document.body.innerHTML = `<div style="color:red; padding:20px; font-family:monospace; font-size:12px; white-space:pre-wrap;">
      <h1>CRITICAL STARTUP ERROR</h1>
      <pre>${e.message}\n${e.filename}:${e.lineno}</pre>
      <button onclick="localStorage.clear();window.location.reload()">HARD RESET</button>
    </div>`;
  }
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface EBProps { children: React.ReactNode }
interface EBState { hasError: boolean; error: any }

class ErrorBoundary extends React.Component<EBProps, EBState> {
  public state: EBState;
  public props: EBProps;

  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          color: 'white',
          background: '#0f172a',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ fontSize: '60px', marginBottom: 20 }}>🛠️</h1>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 10 }}>ALGO SALIÓ MAL</h2>
          <p style={{ color: '#94a3b8', marginBottom: 30, maxWidth: '300px' }}>
            Hubo un error inesperado. Pulsa el botón para intentar reparar la aplicación.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{
              background: '#3b82f6',
              color: 'white',
              padding: '16px 32px',
              borderRadius: '16px',
              fontWeight: 'bold',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.5)'
            }}
          >
            REPARAR Y CERRAR SESIÓN
          </button>

          <div style={{ marginTop: 20, textAlign: 'left', width: '100%', maxWidth: '500px', backgroundColor: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
            <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>Detalles del Error:</p>
            <pre style={{ fontSize: '11px', color: '#f8fafc', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto', margin: 0 }}>
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

