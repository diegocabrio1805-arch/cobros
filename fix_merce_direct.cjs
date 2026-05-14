const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const JUVE_ID = 'a3b09603-57e2-4030-8043-4e92898b932c';
const MERCE_3_ID = '3205c568-6677-4a9c-befd-3a7e8c1bfce4';

async function fix() {
    console.log("Intentando reasignar MERCE 3 a Juve...");
    
    // Intentar sin login (si RLS lo permite)
    const { data: c, error: e1 } = await supabase.from('clients')
        .update({ collector_id: JUVE_ID })
        .eq('id', MERCE_3_ID)
        .select();
        
    if (e1) {
        console.error("Error reasignando cliente:", e1.message);
    } else {
        console.log("✅ Cliente reasignado:", c);
    }

    const { data: l, error: e2 } = await supabase.from('loans')
        .update({ collector_id: JUVE_ID })
        .eq('client_id', MERCE_3_ID)
        .in('status', ['Activo', 'Mora'])
        .select();

    if (e2) {
        console.error("Error reasignando préstamos:", e2.message);
    } else {
        console.log("✅ Préstamos reasignados:", l);
    }
}

fix();
