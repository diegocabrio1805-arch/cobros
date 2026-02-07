import { Preferences } from '@capacitor/preferences';

/**
 * Adaptador de almacenamiento para Supabase usando Capacitor Preferences.
 * Esto asegura que la sesión persista de forma nativa en el dispositivo,
 * evitando que se borre cuando se cierra la aplicación.
 */
export const nativeSupabaseStorage = {
    getItem: async (key: string): Promise<string | null> => {
        const { value } = await Preferences.get({ key });
        return value;
    },
    setItem: async (key: string, value: string): Promise<void> => {
        await Preferences.set({ key, value });
    },
    removeItem: async (key: string): Promise<void> => {
        await Preferences.remove({ key });
    },
};
