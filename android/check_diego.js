
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDiego() {
    console.log("--- DIAGNÓSTICO PROFUNDO DIEGOESCRIBANO ---");

    const email = 'diegoescribano@anexocobro.com';
    const password = '1234';

    // 1. Probar Login
    console.log(`[1] Intentando login: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error("FAIL LOGIN:", authError.message);

        // 2. Si falló, intentar SignUp (por si no existe en auth)
        console.log(`[2] Intentando SignUp (por si falta en auth): ${email}`);
        const { data: signData, error: signError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: 'diegoescribano',
                    role: 'Cobrador'
                }
            }
        });

        if (signError) {
            console.error("FAIL SIGNUP:", signError.message);
        } else {
            console.log("SIGNUP EXITOSO! ID:", signData.user.id);
            console.log("AVISO: Si el signup fue exitoso, es probable que no existía en Auth.");
        }
    } else {
        console.log("AUTH EXITOSA! User ID:", authData.user.id);
    }

    // 3. Verificar Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', 'diegoescribano')
        .single();

    console.log("Perfil actual en DB:", JSON.stringify(profile, null, 2));
}

checkDiego();
