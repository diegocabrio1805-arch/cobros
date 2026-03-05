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

async function verifyStrictMapping() {
    console.log("=== VERIFICACIÓN DE MAPEO ESTRICTO ===");

    // 1. Login como Gerente
    const { data: managerData, error: managerError } = await supabase.auth.signInWithPassword({
        email: 'alterfin@anexocobro.com',
        password: '20252026'
    });

    if (managerError) {
        console.error("❌ Error login gerente:", managerError.message);
        return;
    }
    console.log("✅ Gerente logueado");

    const collectorId = "550e8400-e29b-41d4-a716-446655440000";

    // 2. Simular un Upsert desde el Frontend (Simulando useSync.ts)
    // Usamos snake_case explícito como lo hace ahora useSync.ts
    const now = new Date().toISOString();
    const payload = {
        id: collectorId,
        name: "TEST_STRICT_MAPPING",
        username: "test_strict_" + Math.floor(Math.random() * 100),
        role: "Cobrador",
        managed_by: managerData.user.id,
        expiry_date: "2026-12-31",
        requires_location: true,
        updated_at: now
    };

    console.log("Subiendo datos con mapeo estricto (snake_case)...");
    const { error: upsertError } = await supabase.from('profiles').upsert([payload]);

    if (upsertError) {
        console.error("❌ Error en Upsert:", upsertError.message);
        return;
    }
    console.log("✅ Upsert exitoso");

    // 3. Simular un Pull desde el Frontend (Simulando pullData)
    console.log("Recuperando datos para verificar conversión a camelCase...");
    const { data: pulledData, error: pullError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', collectorId)
        .single();

    if (pullError) {
        console.error("❌ Error en Pull:", pullError.message);
        return;
    }

    // Aquí emulamos la lógica de handleRealtimeData en App.tsx
    const mappedUser = {
        ...pulledData,
        managedBy: pulledData.managed_by,
        expiryDate: pulledData.expiry_date,
        requiresLocation: pulledData.requires_location,
        deletedAt: pulledData.deleted_at
    };

    console.log("\n--- RESULTADO DEL MAPEO ---");
    console.log("Original (managed_by):", pulledData.managed_by);
    console.log("Mapeado (managedBy):", mappedUser.managedBy);
    console.log("Original (requires_location):", pulledData.requires_location);
    console.log("Mapeado (requiresLocation):", mappedUser.requiresLocation);
    console.log("Original (expiry_date):", pulledData.expiry_date);
    console.log("Mapeado (expiryDate):", mappedUser.expiryDate);

    if (mappedUser.managedBy === managerData.user.id &&
        mappedUser.requiresLocation === true &&
        mappedUser.expiryDate === "2026-12-31") {
        console.log("\n🎉 🎉 VERIFICACIÓN EXITOSA: EL MAPEO ES ESTRICTO Y CORRECTO 🎉 🎉");
    } else {
        console.error("\n❌ ERROR: El mapeo falló o los datos no coinciden.");
    }
}

verifyStrictMapping();
