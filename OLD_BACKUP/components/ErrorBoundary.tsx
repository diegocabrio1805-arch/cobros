import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, any> {
    public state: any = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                    <div className="p-8 bg-white rounded-3xl shadow-xl border border-red-100 max-w-lg w-full">
                        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-6 block"></i>
                        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Algo salió mal</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Error crítico de renderizado</p>

                        <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-48 mb-6 text-left">
                            <p className="font-mono text-[10px] text-red-400 font-bold mb-2">
                                {this.state.error?.toString()}
                            </p>
                            <pre className="font-mono text-[9px] text-slate-500 whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            <i className="fa-solid fa-rotate-right mr-2"></i>
                            REINICIAR APLICACIÓN
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
