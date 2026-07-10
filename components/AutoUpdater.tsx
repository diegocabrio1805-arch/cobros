import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const AutoUpdater: React.FC = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('[AutoUpdater] Error en el registro del SW', error);
    },
  });

  React.useEffect(() => {
    // Encapsulación segura: Evita memory leaks si el componente se desmonta
    const intervalId = setInterval(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg) await reg.update();
        } catch (error) {
          console.error('[AutoUpdater] Update check failed:', error);
        }
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(intervalId); // Cleanup fundamental
  }, []);

  // 100% invisible si no hay actualizaciones
  if (!needRefresh) return null;

  // Banner Toast No Intrusivo (Premium)
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-[bounce_1s_infinite]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <i className="fa-solid fa-cloud-arrow-down text-emerald-400"></i>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Actualización</span>
          <span className="text-[11px] font-semibold text-slate-300">Nueva versión lista</span>
        </div>
      </div>
      <button 
        onClick={() => updateServiceWorker(true)} // Esto forzará el vaciado de caché y recarga
        className="bg-emerald-600 active:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg whitespace-nowrap"
      >
        Recargar App
      </button>
    </div>
  );
};

export default AutoUpdater;
