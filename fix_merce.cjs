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

async function checkAndFixMerce() {
    console.log("=== VERIFICANDO MERCE 3 ===");

    // 1. Get Juve's ID
    const { data: profiles } = await supabase.from('profiles').select('id, name').ilike('name', '%JUVE%');
    if (!profiles || profiles.length === 0) { console.error("No se encontró a Juve"); return; }
    const juveId = profiles[0].id;
    console.log(`ID de Juve: ${juveId}`);

    // 2. Find MERCE 3
    const { data: clients } = await supabase.from('clients').select('*').ilike('name', '%MERCE 3%');
    if (!clients || clients.length === 0) { console.error("No se encontró a MERCE 3"); return; }
    
    for (const client of clients) {
        console.log(`Cliente: ${client.name} (${client.id}), Collector: ${client.collector_id}`);
        
        // 3. Fix client assignment if needed
        if (client.collector_id !== juveId) {
            console.log(`Actualizando cliente ${client.name} a Juve...`);
            await supabase.from('clients').update({ collector_id: juveId }).eq('id', client.id);
        }

        // 4. Find all active/mora loans for this client
        const { data: loans } = await supabase.from('loans')
            .select('*')
            .eq('client_id', client.id)
            .in('status', ['Activo', 'Mora']);
            
        for (const loan of loans) {
            console.log(`  Préstamo: ${loan.id}, Status: ${loan.status}, Collector: ${loan.collector_id}, Total: ${loan.total_amount}`);
            
            // 5. Fix loan assignment if needed
            if (loan.collector_id !== juveId) {
                console.log(`    Actualizando préstamo ${loan.id} a Juve...`);
                await supabase.from('loans').update({ collector_id: juveId }).eq('id', loan.id);
            }
        }
    }

    console.log("\n=== COMPLETO ===");
}

checkAndFixMerce();
