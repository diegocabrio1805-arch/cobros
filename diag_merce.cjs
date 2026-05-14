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

async function diag() {
    const { data: profiles } = await supabase.from('profiles').select('id, name');
    console.log("Perfiles encontrados:", profiles.map(p => p.name).join(', '));
    
    const juve = profiles.find(p => p.name && p.name.toUpperCase().includes('JUVE'));
    if (!juve) { console.log("No se encontró a Juve por nombre"); return; }
    
    console.log(`Juve encontrado: ${juve.name} (${juve.id})`);
    
    const { data: merce } = await supabase.from('clients').select('*').ilike('name', '%MERCE 3%');
    if (!merce || merce.length === 0) { console.log("No se encontró MERCE 3"); return; }
    
    for (const c of merce) {
        console.log(`Cliente: ${c.name} (${c.id}), Collector: ${c.collector_id}`);
        const { data: loans } = await supabase.from('loans').select('*').eq('client_id', c.id).in('status', ['Activo', 'Mora']);
        for (const l of loans) {
            console.log(`  Préstamo: ${l.id}, Status: ${l.status}, Collector: ${l.collector_id}`);
        }
    }
}

diag();
