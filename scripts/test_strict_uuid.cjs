require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {

    // Some IDs in the code use text like "admin-1" or specific UUID. Let's send 100% strict UUIDs to all FK fields on insertion:
    const testLog2 = {
        id: uuidv4(),
        loan_id: uuidv4(), // pure uuid
        client_id: uuidv4(), // pure uuid
        branch_id: uuidv4(), // pure uuid
        amount: 8888,
        type: 'PAGO',
        date: new Date().toISOString(),
        location: null,
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        notes: "TEST UUID STRICT",
        recorded_by: uuidv4(), // pure uuid
        updated_at: new Date().toISOString()
    };

    const { data: d2, error: e2 } = await supabase.from('collection_logs').upsert([testLog2]);
    console.log('INSERT RESULT ERROR STRICT UUID:', e2 ? e2.message : 'NULL - SUCCESS!');
}
run();
