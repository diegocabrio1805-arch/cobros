import { createClient } from '@supabase/supabase-js';

// HARDCODED CREDENTIALS FOR STABILITY
const supabaseUrl = 'https://oppcyderpkhcnduqexag.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

console.log('--- SUPABASE CLIENT DEBUG ---');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

import { nativeSupabaseStorage } from './nativeStorage';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        // Activamos auto-refresh para que la sesión no caduque mientras haya internet
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: nativeSupabaseStorage,
        storageKey: 'anexo-cobro-session-v2', // Usamos una nueva clave para evitar conflictos
        flowType: 'implicit'
    },
    global: {
        headers: { 'x-application-name': 'anexo-cobro-mobile' },
        // Custom fetch that doesn't fail the session on network errors
        fetch: async (url, options) => {
            try {
                return await fetch(url, options);
            } catch (error) {
                // If offline, don't throw - just return a failed response
                // This prevents Supabase from invalidating the session
                console.warn('Network request failed (offline mode):', error);
                return new Response(null, { status: 0, statusText: 'Network Error' });
            }
        }
    },
    // Extend session timeout to 7 days to prevent frequent logouts
    db: {
        schema: 'public'
    }
});
