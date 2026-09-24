import localforage from 'localforage';

localforage.config({
    name: 'PrestamasterV2',
    storeName: 'prestamaster_data',
    description: 'Datos offline de la aplicación incluyendo base64 de imagenes'
});
let currentPrefix = '';

export const StorageService = {
    setTenantId(userId: string) {
        currentPrefix = userId ? `${userId}_` : '';
    },

    getTenantId() {
        return currentPrefix;
    },

    _getPrefixedKey(key: string): string {
        // Ignoramos el prefijo para la syncQueue y offline_session para evitar que se pierdan datos si el usuario no tiene prefix seteado aún
        if (key === 'syncQueue' || key === 'NATIVE_CURRENT_USER') {
            return key; 
        }
        return `${currentPrefix}${key}`;
    },

    async getItem<T>(key: string): Promise<T | null> {
        try {
            const finalKey = this._getPrefixedKey(key);
            const data = await localforage.getItem<any>(finalKey);
            if (typeof data === 'string') {
                return JSON.parse(data) as T;
            }
            return data as T;
        } catch (e) {
            console.error(`Error loading ${key} from localforage:`, e);
            return null;
        }
    },

    async setItem(key: string, value: any): Promise<void> {
        try {
            const finalKey = this._getPrefixedKey(key);
            await localforage.setItem(finalKey, value);
        } catch (e) {
            console.error(`Error saving ${key} to localforage:`, e);
            if (e instanceof Error && e.name === 'QuotaExceededError') {
                console.warn("CRITICAL: DISPOSITIVO SIN ESPACIO INCLUSO EN INDEXEDDB!");
            }
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            const finalKey = this._getPrefixedKey(key);
            await localforage.removeItem(finalKey);
        } catch (e) {
            console.error(`Error removing ${key} from localforage:`, e);
        }
    },

    // Fase D: Limpieza de basuras. Borra selectivamente llaves de usuarios viejos.
    async cleanupOldTenants(activeTenantIds: string[]): Promise<void> {
        try {
            const keys = await localforage.keys();
            for (const k of keys) {
                // Si la llave no es syncQueue y tiene un prefijo que no está en la lista de activos
                if (k !== 'syncQueue' && k !== 'NATIVE_CURRENT_USER') {
                    const prefixMatch = k.split('_')[0];
                    if (prefixMatch && prefixMatch.length > 10 && !activeTenantIds.includes(prefixMatch)) {
                        await localforage.removeItem(k);
                    }
                }
            }
        } catch (e) {
            console.warn("Error durante garbage collection de localforage:", e);
        }
    }
};
