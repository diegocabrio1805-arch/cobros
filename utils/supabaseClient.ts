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
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: nativeSupabaseStorage,
        storageKey: 'anexo-cobro-session-v2'
    },
    global: {
        headers: { 'x-application-name': 'anexo-cobro-mobile' },
        fetch: async (url, options) => {
            try {
                return await fetch(url, options);
            } catch (error) {
                console.warn('Network request failed (offline mode):', error);
                return new Response(null, { status: 0, statusText: 'Network Error' });
            }
        }
    }
});
