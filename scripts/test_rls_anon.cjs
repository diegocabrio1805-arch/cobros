require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('Testing insert on collection_logs after ANON RLS fix...');

    const testLog2 = {
        id: uuidv4(),
        loan_id: '3c1fe229-b360-462e-971a-a4df90f65718',
        client_id: 'f1cf7390-486b-4f4f-8f3f-90dfd92aa1a2',
        branch_id: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec',
        amount: 8888,
        type: 'PAGO',
        date: new Date().toISOString(),
        location: null,
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        notes: "TEST ANON FULL INSERTION",
        recorded_by: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec',
        updated_at: new Date().toISOString()
    };

    const { data: d2, error: e2 } = await supabase.from('collection_logs').upsert([testLog2]);
    console.log('INSERT RESULT ERROR:', e2 ? e2.message : 'NULL - SUCCESS!');
    console.log('INSERTED DATA:', d2);
}
run();
