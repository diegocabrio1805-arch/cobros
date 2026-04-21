import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const AutoUpdater: React.FC = () => {
  // Configured to check for new code without interrupting the UI
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates every 5 minutes (300,000 milisegundos)
        setInterval(() => {
          console.log("[AutoUpdater] Checking for new updates on GitHub...");
          r.update().catch(console.error);
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[AutoUpdater] SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      console.log("[AutoUpdater] ¡Nueva versión detectada! Limpiando caché y recargando...");
      // Limpiar IDB para forzar una sincronización fresca con la nueva versión del código
      import('../utils/localforageStorage').then(({ StorageService }) => {
        StorageService.removeItem('prestamaster_v2').then(() => {
          updateServiceWorker(true);
        });
      }).catch(() => {
        updateServiceWorker(true);
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null; // 100% invisible
};

export default AutoUpdater;
