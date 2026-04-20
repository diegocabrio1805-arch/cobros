import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export interface GPSLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export const useGPSWarmer = () => {
  const [activeLocation, setActiveLocation] = useState<GPSLocation | null>(null);

  useEffect(() => {
    let watchId: string | Promise<string>;
    
    const startWatching = async () => {
      try {
        // We start watching with High Accuracy as soon as the app starts
        watchId = Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 3000
        }, (position) => {
          if (position) {
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now()
            };
            setActiveLocation(loc);
            // Also update localStorage for persistence across mini-restarts
            localStorage.setItem('last_known_gps', JSON.stringify({ ...loc, ts: loc.timestamp }));
          }
        });
      } catch (e) {
        console.error("Error starting Global GPS watch:", e);
      }
    };

    startWatching();

    return () => {
      if (watchId) {
        if (typeof watchId === 'string') {
          Geolocation.clearWatch({ id: watchId });
        } else {
          watchId.then(id => Geolocation.clearWatch({ id }));
        }
      }
    };
  }, []);

  return activeLocation;
};
