require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { v4: uuidv4 } = require('uuid');

async function run() {

    // Test 1: Let's use a real, short text ID for loan to see if it triggers the error
    // because loans table has id as "text".
    const testLogTextLoan = {
        id: uuidv4(),
        loan_id: 'short-id-1234',
        client_id: uuidv4(),
        branch_id: uuidv4(),
        amount: 8888,
        type: 'PAGO',
        date: new Date().toISOString(),
        location: null,
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        notes: "TEST TEXT LOAN",
        recorded_by: uuidv4()
    };

    let res = await supabase.from('collection_logs').upsert([testLogTextLoan]);
    console.log('TEXT LOAN_ID ERROR:', res.error ? res.error.message : 'OK');

    // Test 2: Text for branch_id (which connects to profiles.id text)
    const testLogTextBranch = {
        id: uuidv4(),
        loan_id: uuidv4(),
        client_id: uuidv4(),
        branch_id: 'admin-1',
        amount: 8888,
        type: 'PAGO',
        date: new Date().toISOString(),
        location: null,
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        notes: "TEST TEXT BRANCH",
        recorded_by: uuidv4()
    };
    let res2 = await supabase.from('collection_logs').upsert([testLogTextBranch]);
    console.log('TEXT BRANCH_ID ERROR:', res2.error ? res2.error.message : 'OK');

    // Test 3: Text for recorded_by
    const testLogTextRecorder = {
        id: uuidv4(),
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
        notes: "TEST TEXT RECORDER",
        recorded_by: 'admin-1'
    };
    let res3 = await supabase.from('collection_logs').upsert([testLogTextRecorder]);
    console.log('TEXT RECORDED_BY ERROR:', res3.error ? res3.error.message : 'OK');
}
run();
