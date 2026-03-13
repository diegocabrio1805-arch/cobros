
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase con fallback para Android
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oppcyderpkhcnduqexag.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

console.log('🔗 Conectando a Supabase:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
