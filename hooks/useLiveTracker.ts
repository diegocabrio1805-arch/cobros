import { useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '../utils/supabaseClient';
import { User, Role } from '../types';

export const useLiveTracker = (user: User | null) => {
    const channelRef = useRef<any>(null);
    const watchIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Solo rastrear si hay usuario y es Cobrador (o admin probando, pero idealmente cobrador)
        if (!user || user.role !== Role.COLLECTOR) {
            return;
        }

        let isMounted = true;

        const startTracking = async () => {
            try {
                // Configurar el canal de Supabase para Broadcast
                const channel = supabase.channel('room-gps');
                
                channel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[LiveTracker] 🛰️ Canal GPS conectado para: ${user.name}`);
                    }
                });

                channelRef.current = channel;

                // Verificar permisos antes de iniciar watchPosition
                const perm = await Geolocation.checkPermissions();
                if (perm.location !== 'granted') {
                    console.warn('[LiveTracker] Permisos de GPS no otorgados, no se emitirá ubicación en vivo.');
                    return;
                }

                // Iniciar el watchPosition (latido constante)
                // @ts-ignore
                watchIdRef.current = await Geolocation.watchPosition({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000 // Aceptamos hasta 5 segundos de antigüedad
                }, (position, err) => {
                    if (err) {
                        console.error('[LiveTracker] Error leyendo GPS:', err);
                        return;
                    }

                    if (position && position.coords && isMounted && channelRef.current) {
                        const payload = {
                            collectorId: user.id,
                            collectorName: user.name,
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            speed: position.coords.speed || 0,
                            timestamp: Date.now()
                        };

                        // Emitir la coordenada por el canal Broadcast
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'location_update',
                            payload: payload
                        }).catch((e: any) => console.error('[LiveTracker] Error enviando broadcast:', e));
                    }
                });

            } catch (err) {
                console.error('[LiveTracker] Fallo general al iniciar tracker:', err);
            }
        };

        startTracking();

        return () => {
            isMounted = false;
            if (watchIdRef.current) {
                // @ts-ignore
                Geolocation.clearWatch({ id: watchIdRef.current });
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [user]);
};
