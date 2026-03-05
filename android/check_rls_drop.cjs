const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const lines = envLocal.split('\n');
let supabaseUrl = '';
let supabaseKeyAnon = '';

for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKeyAnon = line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKeyAnon);

async function checkRLSDrop() {
    console.log("=== PASO 1: Iniciar Sesión como Gerente ===");
    const { data: managerData, error: managerError } = await supabase.auth.signInWithPassword({
        email: 'alterfin@anexocobro.com',
        password: '20252026'
    });

    if (managerError) {
        console.error("❌ Falló login Gerente:", managerError.message);
        return;
    }

    const collectorId = "550e8400-e29b-41d4-a716-446655440000";

    const profilePayload = {
        id: collectorId,
        name: "ALTERFINZONA01",
        username: "rlstest789",
        password: "rlstest789",
        role: "Cobrador",
        managed_by: managerData.user.id,
        expiry_date: null,
        requires_location: true
    };

    // We are using the Supabase client which has `alterfin`'s token now
    console.log("Enviando Upsert con token de Gerente...");
    const { data, error } = await supabase.from('profiles').upsert([profilePayload]).select();

    console.log('Error:', error);
    console.log('Result Data (should show 1 returned row if successful):', data);
}

checkRLSDrop();
