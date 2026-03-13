
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDiego() {
    console.log("--- DIAGNÓSTICO DIEGOESCRIBANO ---");

    // 1. Probar Login
    const email = 'diegoescribano@anexocobro.com';
    const password = '1234';

    console.log(`Intentando login para: ${email} con pass: ${password}`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error("ERROR DE AUTH:", authError.message);
    } else {
        console.log("AUTH EXITOSA! User ID:", authData.user.id);
    }

    // 2. Buscar en Profiles por username (case insensitive)
    console.log("Buscando en tabla profiles...");
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', 'diegoescribano');

    if (profError) {
        console.error("ERROR DE PERFILES:", profError.message);
    } else {
        console.log("Perfiles encontrados:", JSON.stringify(profiles, null, 2));
    }

    // 3. Buscar a LETI
    console.log("Buscando a LETI...");
    const { data: leti, error: letiError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', 'let%');

    if (letiError) {
        console.error("ERROR LETI:", letiError.message);
    } else {
        console.log("Resultados LETI:", JSON.stringify(leti, null, 2));
    }
}

checkDiego();
