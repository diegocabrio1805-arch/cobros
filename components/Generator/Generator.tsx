import React from 'react';

const Generator: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-400">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center max-w-md">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔒</span>
                </div>
                <h2 className="text-lg font-black text-slate-700 mb-2">Módulo Deshabilitado</h2>
                <p className="text-xs text-slate-500 font-bold">
                    El generador de pagarés está temporalmente fuera de servicio para mantenimiento.
                </p>
            </div>
        </div>
    );
};

export default Generator;
