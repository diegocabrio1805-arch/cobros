import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '../utils/supabaseClient';
import { Preferences } from '@capacitor/preferences';

export interface GPSLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export const useGPSWarmer = () => {
  const [activeLocation, setActiveLocation] = useState<GPSLocation | null>(null);

  useEffect(() => {
    let watchId: string | Promise<string> | null = null;
    let isWatching = false;
    let retryInterval: any;
    let lastUpdateTs = Date.now();
    
    const startWatching = async () => {
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          return; // Esperar a que LocationEnforcer obtenga los permisos
        }

        if (isWatching) return;
        isWatching = true;
        lastUpdateTs = Date.now(); // Reset watchdog

        watchId = Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }, (position, err) => {
          if (err) {
            console.warn("[GPSWarmer] Error en watchPosition, reiniciando...", err);
            isWatching = false; // Permitir reinicio
            return;
          }
          if (position && position.coords) {
            lastUpdateTs = Date.now();
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: lastUpdateTs
            };
            setActiveLocation(loc);
            localStorage.setItem('last_known_gps', JSON.stringify({ ...loc, ts: loc.timestamp }));
          }
        });
      } catch (e) {
        console.error("Error starting Global GPS watch:", e);
        isWatching = false;
      }
    };

    const stopWatching = () => {
      if (watchId) {
        if (typeof watchId === 'string') {
          Geolocation.clearWatch({ id: watchId });
        } else {
          watchId.then(id => Geolocation.clearWatch({ id }));
        }
        watchId = null;
      }
      isWatching = false;
    };

    // Intentar iniciar. Si no hay permisos, el intervalo lo seguirá intentando.
    startWatching();

    // WATCHDOG: Verifica cada 5 segundos si el sensor se quedó dormido (común en Android tras apagar pantalla)
    retryInterval = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastUpdateTs;
        if (!isWatching || timeSinceLastUpdate > 15000) {
            if (timeSinceLastUpdate > 15000 && isWatching) {
                console.warn("[GPSWarmer] Sensor GPS dormido detectado (>15s sin datos). Reiniciando forzosamente...");
                stopWatching();
            }
            startWatching();
        }
    }, 5000);

    // Reinicio forzado al volver a la app (foreground)
    const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
            console.log("[GPSWarmer] App en foreground. Verificando GPS...");
            if (Date.now() - lastUpdateTs > 10000) {
               stopWatching();
               startWatching();
            }
        }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(retryInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopWatching();
    };
  }, []);

  // NUEVO: Motor de envío periódico a Supabase para 'COBRADORGPS'
  useEffect(() => {
    let intervalId: any;

    const pushGpsData = async () => {
      try {
        // 1. Obtener ubicación actual
        const lastGpsStr = localStorage.getItem('last_known_gps');
        if (!lastGpsStr) return;
        const loc = JSON.parse(lastGpsStr);

        // 2. Obtener usuario actual desde Preferences (Capacitor)
        const { value } = await Preferences.get({ key: 'NATIVE_CURRENT_USER' });
        let currentUser: any = null;
        if (value) {
          currentUser = JSON.parse(value);
        } else {
          // Fallback a localStorage
          const prestamaster = localStorage.getItem('prestamaster_v2');
          if (prestamaster) {
            const parsed = JSON.parse(prestamaster);
            currentUser = parsed.currentUser;
          }
        }

        // 3. Filtrar: Solo enviar si es el cobrador de prueba
        if (currentUser && (currentUser.username?.toUpperCase() === 'COBRADORGPS' || currentUser.name?.toUpperCase() === 'COBRADORGPS')) {
          console.log("[GPS Engine] Subiendo posición para COBRADORGPS...");
          const { error } = await supabase
            .from('gps_history')
            .insert({
              collector_id: currentUser.id,
              collector_name: currentUser.name,
              latitude: loc.lat,
              longitude: loc.lng,
              timestamp: new Date().toISOString()
            });
            
          if (error && !error.message.includes("schema cache")) {
            console.error("[GPS Engine] Error subiendo GPS:", error.message);
          }
        }
      } catch (e) {
        // Fallback silencioso
      }
    };

    // Ejecutar cada 40 segundos para cuidar batería
    intervalId = setInterval(pushGpsData, 40000);
    // Ejecutar también una vez al inicio
    pushGpsData();

    return () => clearInterval(intervalId);
  }, []);

  return activeLocation;
};
