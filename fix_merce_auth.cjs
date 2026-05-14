const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const lines = envLocal.split('\n');
let supabaseUrl = '';
let supabaseKeyAnon = '';

for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKeyAnon = line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKeyAnon);

async function checkAndFix() {
    console.log("=== INICIANDO SESIÓN ===");
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'alterfin@anexocobro.com',
        password: '20252026'
    });
    if (authError) { console.error("Error Auth:", authError.message); return; }
    console.log("✅ Sesión iniciada");

    // 1. Get Juve's ID
    const { data: profiles } = await supabase.from('profiles').select('id, name');
    const juve = profiles.find(p => p.name && p.name.toUpperCase().includes('JUVE'));
    if (!juve) { console.log("No se encontró a Juve"); return; }
    const juveId = juve.id;
    console.log(`Juve: ${juve.name} (${juveId})`);

    // 2. Find MERCE 3
    const { data: merce } = await supabase.from('clients').select('*').ilike('name', '%MERCE 3%');
    if (!merce || merce.length === 0) { console.log("No se encontró MERCE 3"); return; }
    
    for (const c of merce) {
        console.log(`\nCliente: ${c.name} (${c.id})`);
        console.log(`  Collector Actual: ${c.collector_id}`);
        
        if (c.collector_id !== juveId) {
            console.log(`  --> Reasignando cliente a Juve...`);
            await supabase.from('clients').update({ collector_id: juveId }).eq('id', c.id);
        }

        // 3. Find ALL active/mora loans for this client ID
        const { data: loans } = await supabase.from('loans')
            .select('*')
            .eq('client_id', c.id)
            .in('status', ['Activo', 'Mora']);
            
        for (const l of loans) {
            console.log(`  Préstamo: ${l.id}, Status: ${l.status}, Collector: ${l.collector_id}`);
            if (l.collector_id !== juveId) {
                console.log(`    --> Reasignando préstamo a Juve...`);
                await supabase.from('loans').update({ collector_id: juveId }).eq('id', l.id);
            }
        }
    }

    console.log("\n=== COMPLETO ===");
}

checkAndFix();
