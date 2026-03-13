import localforage from 'localforage';

localforage.config({
    name: 'PrestamasterV2',
    storeName: 'prestamaster_data',
    description: 'Datos offline de la aplicación incluyendo base64 de imagenes'
});

export const StorageService = {
    async getItem<T>(key: string): Promise<T | null> {
        try {
            const data = await localforage.getItem<string>(key);
            if (data) return JSON.parse(data) as T;
            return null;
        } catch (e) {
            console.error(`Error loading ${key} from localforage:`, e);
            return null;
        }
    },

    async setItem(key: string, value: any): Promise<void> {
        try {
            await localforage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error saving ${key} to localforage:`, e);
            if (e instanceof Error && e.name === 'QuotaExceededError') {
                console.warn("CRITICAL: DISPOSITIVO SIN ESPACIO INCLUSO EN INDEXEDDB!");
            }
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            await localforage.removeItem(key);
        } catch (e) {
            console.error(`Error removing ${key} from localforage:`, e);
        }
    }
};
