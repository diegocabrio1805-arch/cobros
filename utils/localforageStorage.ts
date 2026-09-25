import localforage from 'localforage';

localforage.config({
    name: 'PrestamasterV2',
    storeName: 'prestamaster_data',
    description: 'Datos offline de la aplicación incluyendo base64 de imagenes'
});

// Aislamiento Multi-Usuario
let currentPrefix = '';

// Claves que JAMÁS llevarán prefijo (son compartidas por todos los usuarios del dispositivo)
const GLOBAL_KEYS = ['syncQueue', 'failedSyncItems', 'NATIVE_CURRENT_USER'];

export const StorageService = {
    setTenantId(userId: string) {
        currentPrefix = userId ? `${userId}_` : '';
    },

    getTenantId() {
        return currentPrefix;
    },

    _getPrefixedKey(key: string): string {
        if (GLOBAL_KEYS.includes(key)) {
            return key; 
        }
        return `${currentPrefix}${key}`;
    },

    getSyncKey(key: string): string {
        if (currentPrefix === '') {
            console.warn(`[StorageService] Alerta: getSyncKey llamado para ${key} con tenant vacío.`);
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
            // BLOQUEO ESTRÍCTO DE ESCRITURAS SIN TENANT
            if (currentPrefix === '' && !GLOBAL_KEYS.includes(key)) {
                console.error(`[StorageService] 🛑 BLOQUEO DE SEGURIDAD: Intento de guardar '${key}' sin un tenantId activo. Operación abortada para evitar contaminación global.`);
                return; // Cortocircuito absoluto
            }

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

    // Garbage Collector Blindado
    async cleanupOldTenants(activeTenantIds: string[]): Promise<void> {
        try {
            const keys = await localforage.keys();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            for (const k of keys) {
                // 1. Ignorar explícitamente las claves globales
                if (GLOBAL_KEYS.includes(k)) continue;

                // 2. Extraer prefijo
                const parts = k.split('_');
                const possiblePrefix = parts[0];

                // 3. Evaluar si es una clave huérfana de un usuario (debe coincidir con formato UUID exacto)
                if (possiblePrefix && uuidRegex.test(possiblePrefix)) {
                    // Si el UUID no está en la lista de activos, eliminar la caché de ESE usuario
                    if (!activeTenantIds.includes(possiblePrefix)) {
                        // SEGURIDAD: Solo borrar claves de inquilino conocidas, ignorar futuras
                        const suffix = parts.slice(1).join('_');
                        const knownSuffixes = ['prestamaster_v2', 'last_sync_timestamp_v8', 'last_sync_timestamp_ms'];
                        
                        if (knownSuffixes.includes(suffix)) {
                            console.log(`[StorageService GC] Eliminando caché antigua del tenant inactivo: ${k}`);
                            await localforage.removeItem(k);
                        }
                    }
                }
                // Si la clave no tiene prefijo UUID válido (ej. viejos 'prestamaster_v2'), se IGNORA INTACTA.
            }
        } catch (e) {
            console.warn("Error durante garbage collection de localforage:", e);
        }
    }
};
