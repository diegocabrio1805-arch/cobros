// Pegar esto en la consola del navegador (F12 → Console) en la pestaña de cobros
// Elimina el registro fantasma de FERNANDEZ DURE, EULALIO del cache local

(async () => {
  try {
    // 1. Limpiar localStorage (cache de datos de la app)
    const keysToCheck = [];
    for (let i = 0; i < localStorage.length; i++) {
      keysToCheck.push(localStorage.key(i));
    }

    let found = false;
    for (const key of keysToCheck) {
      try {
        const val = localStorage.getItem(key);
        if (!val) continue;
        const parsed = JSON.parse(val);
        
        // Buscar en collectionLogs
        if (parsed && parsed.collectionLogs && Array.isArray(parsed.collectionLogs)) {
          const before = parsed.collectionLogs.length;
          parsed.collectionLogs = parsed.collectionLogs.filter(log => {
            const isTarget = 
              log.type === 'PAYMENT' &&
              Math.abs((log.amount || 0) - 1018020) < 100 &&
              (!log.location || log.location.lat === 0);
            return !isTarget;
          });
          if (parsed.collectionLogs.length < before) {
            localStorage.setItem(key, JSON.stringify(parsed));
            console.log(`✅ Registro eliminado de cache "${key}". (${before} → ${parsed.collectionLogs.length} logs)`);
            found = true;
          }
        }
      } catch(e) { /* no era JSON */ }
    }

    // 2. Limpiar IndexedDB (localforage)
    try {
      const localforage = window.localforage;
      if (localforage) {
        const keys = await localforage.keys();
        for (const key of keys) {
          const val = await localforage.getItem(key);
          if (val && val.collectionLogs && Array.isArray(val.collectionLogs)) {
            const before = val.collectionLogs.length;
            val.collectionLogs = val.collectionLogs.filter(log => {
              const isTarget = 
                log.type === 'PAYMENT' &&
                Math.abs((log.amount || 0) - 1018020) < 100 &&
                (!log.location || log.location.lat === 0);
              return !isTarget;
            });
            if (val.collectionLogs.length < before) {
              await localforage.setItem(key, val);
              console.log(`✅ Registro eliminado de IndexedDB "${key}".`);
              found = true;
            }
          }
        }
      }
    } catch(e) { console.warn('IndexedDB:', e.message); }

    if (!found) {
      console.log('ℹ️  No se encontró el registro en caché. Recargá la página (Ctrl+Shift+R).');
    } else {
      console.log('\n🔄 Recargando página para aplicar cambios...');
      setTimeout(() => location.reload(true), 1000);
    }
  } catch(e) {
    console.error('Error:', e);
  }
})();
