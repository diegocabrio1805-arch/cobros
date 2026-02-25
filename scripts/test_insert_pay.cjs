require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const pRec = {
        id: 'test-pay-123',
        loan_id: '3c1fe229-b360-462e-971a-a4df90f65718',
        client_id: 'f1cf7390-486b-4f4f-8f3f-90dfd92aa1a2',
        collector_id: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec',
        branch_id: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec',
        amount: 8888,
        date: new Date().toISOString(),
        installment_number: 1,
        is_virtual: false,
        is_renewal: false,
        created_at: new Date().toISOString()
    };

    const { data: d, error: e } = await supabase.from('payments').upsert([pRec]);
    console.log('PAYMENTS ERROR:', e);
}
run();
