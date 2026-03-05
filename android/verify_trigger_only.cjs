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

async function verifyTriggerOnly() {
    console.log("=== PASO 1: Iniciar Sesión como Gerente ===");
    const { data: managerData, error: managerError } = await supabase.auth.signInWithPassword({
        email: 'alterfin@anexocobro.com',
        password: '20252026'
    });

    if (managerError) {
        console.error("❌ Falló login Gerente:", managerError.message);
        return;
    }

    const newUsername = "cobradortrigger" + Math.floor(Math.random() * 1000);
    const newPassword = "triggerpass" + Math.floor(Math.random() * 1000);
    const collectorId = "550e8400-e29b-41d4-a716-446655440000";

    // SKIP THE EDGE FUNCTION. ONLY DO UPSERT
    const profilePayload = {
        id: collectorId,
        name: "ALTERFINZONA01",
        username: newUsername,
        password: newPassword,
        role: "Cobrador",
        managed_by: managerData.user.id,
        expiry_date: null,
        requires_location: false
    };

    console.log("Guardando en tabla perfiles (debe disparar el trigger)...");
    const { error: upsertError } = await supabase.from('profiles').upsert([profilePayload]);
    if (upsertError) {
        console.error("❌ Falló actualización de Perfil:", upsertError.message);
        return;
    }

    await supabase.auth.signOut();

    console.log(`Intentando login con -> Usuario: ${newUsername} | Clave: ${newPassword}`);
    const { data: collectorData, error: collectorError } = await supabase.auth.signInWithPassword({
        email: newUsername + '@anexocobro.com',
        password: newPassword
    });

    if (collectorError) {
        console.error("❌ NO SE PUDO ENTRAR AL COBRADOR:", collectorError.message);
    } else {
        console.log("🎉🎉 ¡ÉXITO! ¡EL TRIGGER FUNCIONA PARA EL LOGIN! 🎉🎉");
    }
}

verifyTriggerOnly();
