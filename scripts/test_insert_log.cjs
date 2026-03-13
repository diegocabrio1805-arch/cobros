require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('Testing insert on collection_logs...');

    // Using valid existing IDs from test_admin.cjs
    const testLog = {
        id: 'test-log-1234567890',
        loan_id: '3c1fe229-b360-462e-971a-a4df90f65718', // from Diego Villalba's loan (pay-2b6f3c69-e45e-454d-a7a0-9223c65319e2-5)
        client_id: 'f1cf7390-486b-4f4f-8f3f-90dfd92aa1a2',
        branch_id: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec',
        amount: 1234,
        type: 'PAGO',
        date: new Date().toISOString(),
        location: null, // Test if null is allowed
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        notes: "TEST INSERTION",
        recorded_by: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec', // Admin ID
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('collection_logs').upsert([testLog]);
    console.log('INSERT RESULT ERROR:', error);
    console.log('INSERT RESULT DATA:', data);

    if (error) {
        console.error("DETAILS:", error.details, error.message, error.hint);
    }
}
run();
