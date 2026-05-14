const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const emails = ['alterfin@anexocobros.app', 'alterfin@anexocobro.com'];
const password = '20252026';

async function fix() {
    let authData = null;
    for (const email of emails) {
        console.log(`Intentando login con ${email}...`);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) { authData = data; break; }
        console.log(`  Falló: ${error.message}`);
    }

    if (!authData) { console.error("No se pudo iniciar sesión con ninguna cuenta conocida."); return; }
    console.log("✅ Sesión iniciada");

    const JUVE_ID = 'a3b09603-57e2-4030-8043-4e92898b932c';
    const MERCE_3_ID = '3205c568-6677-4a9c-befd-3a7e8c1bfce4';

    // Try both snake_case and camelCase
    const columns = ['collector_id', 'collectorId'];
    
    for (const col of columns) {
        console.log(`Intentando actualizar 'clients' usando columna '${col}'...`);
        const updateObj = {};
        updateObj[col] = JUVE_ID;
        
        const { data, error } = await supabase.from('clients')
            .update(updateObj)
            .eq('id', MERCE_3_ID)
            .select();
            
        if (!error) {
            console.log(`✅ Cliente reasignado con columna '${col}':`, data);
            break;
        } else {
            console.log(`  Error con '${col}': ${error.message}`);
        }
    }

    for (const col of columns) {
        console.log(`Intentando actualizar 'loans' usando columna '${col}'...`);
        const updateObj = {};
        updateObj[col] = JUVE_ID;
        
        const { data, error } = await supabase.from('loans')
            .update(updateObj)
            .eq('client_id', MERCE_3_ID)
            .in('status', ['Activo', 'Mora'])
            .select();
            
        if (!error) {
            console.log(`✅ Préstamos reasignados con columna '${col}':`, data);
            break;
        } else {
            console.log(`  Error con '${col}': ${error.message}`);
        }
    }

    console.log("=== COMPLETO ===");
}

fix();
