import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testCollector(username, password) {
    console.log(`\n=== ${username} ===`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${username}@anexocobro.com`,
        password,
    });

    if (authError || !authData?.user) {
        console.log(`  FALLO LOGIN: ${authError?.message}`);
        return;
    }
    console.log(`  Login OK: ${authData.user.id}`);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
    if (!profile) { console.log('  Sin perfil'); await supabase.auth.signOut(); return; }
    console.log(`  managed_by: ${profile.managed_by || 'VACIO - BUG!'}`);

    const { data: loans } = await supabase.from('loans').select('client_id').eq('collector_id', authData.user.id);
    const unique = new Set(loans?.map(l => l.client_id) || []);
    console.log(`  Prestamos: ${loans?.length || 0} | Clientes unicos: ${unique.size}`);

    await supabase.auth.signOut();
}

(async () => {
    for (const [u, p] of [['diegovillalba', 'Cobros2026'], ['zona2', 'Cobros2026'], ['zona3', 'Cobros2026'], ['zona4', 'Cobros2026'], ['zona1', 'Cobros2026']]) {
        await testCollector(u, p);
    }
    console.log('\nFin.');
})();
