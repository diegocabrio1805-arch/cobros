import { Geolocation } from '@capacitor/geolocation';

/**
 * Servicio para manejar la geolocalización con permisos adecuados
 */
export const requestLocationPermission = async (): Promise<boolean> => {
    try {
        const permission = await Geolocation.checkPermissions();

        if (permission.location === 'granted') {
            return true;
        }

        if (permission.location === 'denied') {
            alert('Los permisos de ubicación fueron denegados. Por favor, habilítalos en la configuración de la aplicación.');
            return false;
        }

        // Solicitar permisos si no están otorgados
        const requestResult = await Geolocation.requestPermissions();
        return requestResult.location === 'granted';
    } catch (error) {
        console.error('Error al verificar permisos de ubicación:', error);
        return false;
    }
};

/**
 * Obtiene la ubicación actual del dispositivo
 */
export const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
            throw new Error('Permisos de ubicación denegados');
        }

        const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });

        return {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
    } catch (error: any) {
        console.error('Error al obtener ubicación:', error);

        if (error.message?.includes('denied') || error.message?.includes('permission')) {
            throw new Error('Debes habilitar los permisos de ubicación en la configuración de tu dispositivo');
        }

        throw new Error('No se pudo obtener la ubicación. Verifica que el GPS esté activado');
    }
};
