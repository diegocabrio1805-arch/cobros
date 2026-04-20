const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (Reemplaza con tus credenciales reales o variables de entorno)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'tu-anon-key';

// Intenta leer credenciales de un archivo .env local
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debugDiegoFabian() {
    console.log("🔍 Buscando usuario 'Fabian'...");
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', '%Fabian%');

    if (userError) {
        console.error("❌ Error buscando usuario:", userError);
        return;
    }

    if (!users || users.length === 0) {
        console.error("❌ No se encontró ningún usuario con nombre 'Fabian'.");
    } else {
        console.log("✅ Usuario(s) encontrado(s):");
        users.forEach(u => {
            console.log(`   - ID: ${u.id}, Name: ${u.name}, Role: ${u.role}`);
            console.log(`   - Keys available: ${Object.keys(u).join(', ')}`);
            console.log(`   - Branch ID (try): ${u.branch_id} / ${u.branchId}`);
            console.log(`   - Managed By: ${u.managed_by} / ${u.managedBy}`);
        });
    }

    console.log("\n🔍 Buscando cliente 'Diego Cardozo'...");
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', '%Diego%')
        .ilike('name', '%Cardozo%'); // Doble filtro para mayor precisión

    if (clientError) {
        console.error("❌ Error buscando cliente:", clientError);
        return;
    }

    if (!clients || clients.length === 0) {
        console.error("❌ No se encontró ningún cliente 'Diego Cardozo'.");
    } else {
        console.log("✅ Cliente(s) encontrado(s):");
        for (const c of clients) {
            console.log(`   - ID: ${c.id}, Name: ${c.name}, Branch ID: ${c.branch_id}`);
            console.log(`   - Added By: ${c.added_by} / ${c.addedBy}`);
            console.log(`   - Client Hidden: ${Boolean(c.isHidden)} (Raw: ${c.isHidden} / ${c.is_hidden})`);

            const { data: loans, error: loanError } = await supabase
                .from('loans')
                .select('*')
                .eq('client_id', c.id);

            if (loans && loans.length > 0) {
                console.log(`     - Has ${loans.length} loans:`);
                loans.forEach(l => console.log(`       - Loan ID: ${l.id}, Status: ${l.status}, Collector: ${l.collector_id}`));
            } else {
                console.log(`     - Has NO loans.`);
            }
        }
    }
}

debugDiegoFabian();
