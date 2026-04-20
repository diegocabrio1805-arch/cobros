// Script para verificar que el login y los datos de cobradores funcionan correctamente
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MzEwNDIsImV4cCI6MjA1NjIwNzA0Mn0.Q6fcqt3Iz5mXUE_a5m5pkrGpJQ4EQOiMcMk6TnnAi-c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const collectors = [
    { username: 'diegovillalba', password: 'Cobros2026' },
    { username: 'zona2', password: 'Cobros2026' },
    { username: 'zona4', password: 'Cobros2026' },
    { username: 'zona1', password: 'Cobros2026' },
    { username: 'zona3', password: 'Cobros2026' },
];

async function testCollector(username, password) {
    console.log(`\n=== Probando: ${username} ===`);

    // 1. Login con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${username}@anexocobro.com`,
        password: password,
    });

    if (authError) {
        console.log(`  ❌ Login FALLIDO: ${authError.message}`);
        return;
    }

    console.log(`  ✅ Login OK - Auth ID: ${authData.user.id}`);

    // 2. Obtener perfil desde profiles
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

    if (profileError || !profile) {
        console.log(`  ❌ Perfil no encontrado`);
        await supabase.auth.signOut();
        return;
    }

    console.log(`  👤 Perfil: ${profile.name} | managed_by: ${profile.managed_by}`);
    console.log(`  👤 managed_by definido: ${profile.managed_by ? '✅ SÍ' : '❌ NO - Este es el bug!'}`);

    // 3. Contar préstamos del cobrador
    const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('id, client_id, status')
        .eq('collector_id', authData.user.id);

    if (loansError) {
        console.log(`  ❌ Error al leer préstamos: ${loansError.message}`);
    } else {
        const uniqueClients = new Set(loans.map(l => l.client_id));
        console.log(`  📋 Préstamos: ${loans?.length || 0} | Clientes únicos: ${uniqueClients.size}`);
    }

    // 4. Contar clientes con branch_id del cobrador
    const { data: clientsBranch } = await supabase
        .from('clients')
        .select('id')
        .eq('branch_id', authData.user.id);

    // 5. Contar clientes con branch_id del manager (Daniel)
    const { data: clientsManager } = await supabase
        .from('clients')
        .select('id')
        .eq('branch_id', 'b3716a78-fb4f-4918-8c0b-92004e3d63ec');

    console.log(`  🏠 Clientes con branch_id=cobrador: ${clientsBranch?.length || 0}`);
    console.log(`  🏠 Clientes con branch_id=Daniel (admin): ${clientsManager?.length || 0}`);

    await supabase.auth.signOut();
}

async function main() {
    console.log('🚀 Iniciando verificación de cobradores...\n');

    for (const c of collectors) {
        await testCollector(c.username, c.password);
    }

    console.log('\n✅ Verificación completa.');
    console.log('');
    console.log('INTERPRETACIÓN:');
    console.log('  - Si managed_by es SÍ: el login funciona y los clientes deberían verse');
    console.log('  - Clientes visibles = clientes donde branch_id = ID del Daniel (admin)');
}

main().catch(console.error);
