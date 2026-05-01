import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Toast } from '@capacitor/toast';

const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');
import { supabase } from '../utils/supabaseClient';
import { Preferences } from '@capacitor/preferences';
import { User, Role } from '../types';

export interface GPSLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export const useGPSWarmer = (user: User | null) => {
  const [activeLocation, setActiveLocation] = useState<GPSLocation | null>(null);

  useEffect(() => {
    let nativeWatcherId: string | null = null;
    let webWatchId: string | Promise<string> | null = null;
    let isWatching = false;
    let retryInterval: any;
    let lastUpdateTs = Date.now();

    const startWatching = async () => {
      if (!user || user.role !== Role.COLLECTOR) return;

      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          return; // Esperar a que LocationEnforcer obtenga los permisos
        }

        if (isWatching) return;
        isWatching = true;
        lastUpdateTs = Date.now();

        // 1. FORZAR PRIMERA LECTURA INMEDIATA (Soporte para interiores)
        try {
          // Intento 1: Alta precisión (Satélite)
          let initialPosition;
          try {
            initialPosition = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
          } catch (highAccErr) {
            console.warn("[GPSWarmer] Fallo alta precisión, intentando baja precisión (interiores)...");
            // Intento 2: Baja precisión (Wi-Fi / Redes - Funciona bajo techo)
            initialPosition = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
          }

          if (initialPosition && initialPosition.coords) {
            const initialLoc = {
              lat: initialPosition.coords.latitude,
              lng: initialPosition.coords.longitude,
              timestamp: Date.now()
            };
            setActiveLocation(initialLoc);
            localStorage.setItem('last_known_gps', JSON.stringify({ ...initialLoc, ts: initialLoc.timestamp }));
            console.log("[GPSWarmer] Posición inicial capturada.");
          }
        } catch (e: any) {
          console.warn("[GPSWarmer] No se pudo obtener la posición inicial:", e);
          Toast.show({ text: `GPS Bloqueado: Sal al exterior 1 minuto.`, duration: 'long' }).catch(()=>{});
        }

        if (Capacitor.isNativePlatform()) {
          // MODULO MILITAR: Background Geolocation
          BackgroundGeolocation.addWatcher({
              backgroundMessage: "La app está usando el GPS para actualizar tu ubicación en vivo.",
              backgroundTitle: "Anexo Cobro - Rastreo Activo",
              requestPermissions: true,
              stale: false,
              distanceFilter: 5 // Cada 5 metros actualiza
            }, (location: any, error: any) => {
              if (error) {
                console.error("[GPSWarmer] Error en Background GPS:", error);
                return;
              }
              if (location) {
                lastUpdateTs = Date.now();
                const loc = {
                  lat: location.latitude,
                  lng: location.longitude,
                  timestamp: lastUpdateTs
                };
                setActiveLocation(loc);
                localStorage.setItem('last_known_gps', JSON.stringify({ ...loc, ts: loc.timestamp }));
              }
          }).then((id: string) => {
            nativeWatcherId = id;
            console.log(`[GPSWarmer] Background watcher activado: ${id}`);
          });
        } else {
          // Fallback para Web (pruebas locales)
          webWatchId = Geolocation.watchPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
          }, (position, err) => {
            if (err) {
              console.warn("[GPSWarmer] Error en watchPosition web:", err);
              isWatching = false;
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
        }
      } catch (e) {
        console.error("Error starting Global GPS watch:", e);
        isWatching = false;
      }
    };

    const stopWatching = () => {
      if (Capacitor.isNativePlatform() && nativeWatcherId) {
        BackgroundGeolocation.removeWatcher({ id: nativeWatcherId });
        nativeWatcherId = null;
      } else if (webWatchId) {
        if (typeof webWatchId === 'string') {
          Geolocation.clearWatch({ id: webWatchId });
        } else {
          webWatchId.then(id => Geolocation.clearWatch({ id }));
        }
        webWatchId = null;
      }
      isWatching = false;
    };

    startWatching();

    // El watchdog sigue existiendo por seguridad, pero es mucho más pasivo con BackgroundGeolocation
    retryInterval = setInterval(() => {
        if (!user || user.role !== Role.COLLECTOR) return;

        const timeSinceLastUpdate = Date.now() - lastUpdateTs;
        if (!isWatching || timeSinceLastUpdate > 120000) { // 2 minutos tolerancia en background
            if (timeSinceLastUpdate > 120000 && isWatching) {
                console.warn("[GPSWarmer] Watchdog reiniciando sensor (muy antiguo)...");
                stopWatching();
            }
            startWatching();
        }
    }, 15000);

    const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
            console.log("[GPSWarmer] App en foreground.");
            if (Date.now() - lastUpdateTs > 20000) {
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
  }, [user]);

  // NUEVO: Motor de envío periódico a Supabase para 'COBRADORGPS'
  useEffect(() => {
    let intervalId: any;

    const pushGpsData = async () => {
      try {
        // 1. Obtener ubicación actual
        const lastGpsStr = localStorage.getItem('last_known_gps');
        if (!lastGpsStr) {
          return;
        }
        const loc = JSON.parse(lastGpsStr);

        // 2. Obtener usuario actual desde Preferences (Capacitor)
        const { value } = await Preferences.get({ key: 'NATIVE_CURRENT_USER' });
        let currentUser: any = null;
        if (value) {
          currentUser = JSON.parse(value);
        } else {
          const prestamaster = localStorage.getItem('prestamaster_data'); // FALLBACK CORREGIDO
          if (prestamaster) {
             const parsed = JSON.parse(prestamaster);
             currentUser = parsed.currentUser;
          }
        }

        // 3. Subir a Supabase
        if (currentUser) {
          console.log(`[GPS Engine] Subiendo posición para ${currentUser.name}...`);
          const { error } = await supabase
            .from('gps_history')
            .insert({
              collector_id: currentUser.id,
              collector_name: currentUser.name,
              latitude: loc.lat,
              longitude: loc.lng,
              timestamp: new Date(loc.ts || loc.timestamp || Date.now()).toISOString()
            });
            
          if (error && !error.message.includes("schema cache")) {
            console.error("[GPS Engine] Error subiendo GPS:", error.message);
            Toast.show({ text: `GPS Sync Error: ${error.message}` }).catch(()=>{});
          }
        } else {
          console.warn("[GPS Engine] No se encontró usuario en Preferences o LocalStorage");
        }
      } catch (e: any) {
        console.error("[GPS Engine] Crash silencioso:", e);
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
