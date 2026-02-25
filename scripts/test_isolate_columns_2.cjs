require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { v4: uuidv4 } = require('uuid');

async function run() {

    // Test 4: Text for client_id
    const testLogTextClient = {
        id: uuidv4(),
        loan_id: uuidv4(),
        client_id: 'short-id-1234',
        branch_id: uuidv4(),
        amount: 8888,
        type: 'PAGO',
        date: new Date().toISOString(),
        location: null,
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        notes: "TEST TEXT CLIENT",
        recorded_by: uuidv4()
    };
    let res4 = await supabase.from('collection_logs').upsert([testLogTextClient]);
    console.log('TEXT CLIENT_ID ERROR:', res4.error ? res4.error.message : 'OK');

    // Test 5: Try specific invalid format uuid
    const testLogTextId = {
        id: 'some-random-id', // Use short ID for primary key!
        loan_id: uuidv4(),
        client_id: uuidv4(),
        branch_id: uuidv4(),
        amount: 8888,
        type: 'PAGO',
        date: new Date().toISOString(),
        location: null,
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        notes: "TEST TEXT PRIMARY ID",
        recorded_by: uuidv4()
    };
    let res5 = await supabase.from('collection_logs').upsert([testLogTextId]);
    console.log('TEXT PRIMARY ID ERROR:', res5.error ? res5.error.message : 'OK');
}
run();
