require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {

    // Test 6: Try exact properties sent by Web App (like test_insert_log.cjs)
    // Wait, the FIRST test script (test_insert_log.cjs) FAILED with text=uuid.
    // Let's re-run it exactly:
    const testLog = {
        id: 'test-log-1234567890',
        loan_id: '3c1fe229-b360-462e-971a-a4df90f65718',
        client_id: 'f1cf7390-486b-4f4f-8f3f-90dfd92aa1a2',
        branch_id: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec',
        amount: 1234,
        type: 'PAGO',
        date: new Date().toISOString(),
        location: null,
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        notes: "TEST INSERTION",
        recorded_by: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec',
        updated_at: new Date().toISOString()
    };

    let res = await supabase.from('collection_logs').upsert([testLog]);
    console.log('ORIGINAL EXACT TEST ERROR:', res.error ? res.error.message : 'OK');

}
run();
