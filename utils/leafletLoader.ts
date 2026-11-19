let leafletPromise: Promise<any> | null = null;

/**
 * Carga Leaflet CSS + JS bajo demanda solo cuando una vista con mapa se abre.
 * Evita bloquear el arranque inicial en celulares con señal lenta u offline.
 */
export const loadLeaflet = (): Promise<any> => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css="true"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      link.setAttribute('data-leaflet-css', 'true');
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector('script[data-leaflet-js="true"]') as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).L) {
        resolve((window as any).L);
        return;
      }
      existingScript.addEventListener('load', () => resolve((window as any).L));
      existingScript.addEventListener('error', (err) => {
        leafletPromise = null;
        reject(err);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.async = true;
    script.setAttribute('data-leaflet-js', 'true');
    script.onload = () => resolve((window as any).L);
    script.onerror = (err) => {
      leafletPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return leafletPromise;
};
