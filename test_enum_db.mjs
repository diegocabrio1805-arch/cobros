import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: clients } = await supabase.from('clients').select('*').limit(1);
    if (!clients || !clients[0]) return console.log("No clients.");
    
    console.log("Intentando Insertar con 'ACTIVE':");
    const { data: res1, error: err1 } = await supabase.from('loans').insert([{
        id: 'L-test-enum-1',
        client_id: clients[0].id,
        branch_id: clients[0].branch_id,
        collector_id: clients[0].added_by,
        principal: 100,
        total_amount: 100,
        status: 'ACTIVE'
    }]);
    if (err1) console.error("Error 'ACTIVE':", err1);
    else console.log("¡ÉXITO CON 'ACTIVE'!");

    console.log("\nIntentando Insertar con 'Activo':");
    const { data: res2, error: err2 } = await supabase.from('loans').insert([{
        id: 'L-test-enum-2',
        client_id: clients[0].id,
        branch_id: clients[0].branch_id,
        collector_id: clients[0].added_by,
        principal: 100,
        total_amount: 100,
        status: 'Activo'
    }]);
    if (err2) console.error("Error 'Activo':", err2);
    else console.log("¡ÉXITO CON 'Activo'!");

    // cleanup
    await supabase.from('loans').delete().in('id', ['L-test-enum-1', 'L-test-enum-2']);
}
run();
