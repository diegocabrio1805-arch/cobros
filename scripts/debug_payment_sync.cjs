
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    console.log("--- Debugging Payment Sync ---");

    const supervisorId = `test-sup-${Date.now()}`;
    const clientId = `test-client-${Date.now()}`;
    const loanId = `test-loan-${Date.now()}`;
    const paymentId = `pay-${Date.now()}-inst-1`;

    // 1. Setup Dependencies (Profile, Client, Loan)
    console.log("1. Setting up dependencies...");
    const { error: err1 } = await supabase.from('profiles').insert({
        id: supervisorId, name: 'Sup', username: supervisorId, password: '123', role: 'Gerente', blocked: false
    });
    if (err1) console.log("Profile err:", err1);

    const { error: err2 } = await supabase.from('clients').insert({
        id: clientId, name: 'Cli', document_id: '999', phone: '555', address: 'Addr', credit_limit: 1000, branch_id: supervisorId, is_active: true
    });
    if (err2) console.log("Client err:", err2);

    const { error: err3 } = await supabase.from('loans').insert({
        id: loanId, client_id: clientId, branch_id: supervisorId, principal: 100000, interest_rate: 20, total_installments: 10, installment_value: 12000, total_amount: 120000, status: 'Activo', frequency: 'Diaria', created_at: new Date().toISOString()
    });
    if (err3) console.log("Loan err:", err3);

    // 2. Attempt Payment Insert (Exact Payload Logic)
    console.log("2. Attempting Payment Insert...");

    const paymentPayload = {
        id: paymentId,
        loan_id: loanId,
        client_id: clientId,
        branch_id: supervisorId, // Checking if this works
        amount: 5000,
        date: new Date().toISOString(),
        installment_number: 1,
        is_virtual: false,
        is_renewal: false,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('payments').upsert(paymentPayload);

    if (error) {
        console.error("!!! INSERT FAILED !!!");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
    } else {
        console.log("SUCCESS: Payment inserted correctly.");
    }

    // 3. Cleanup
    console.log("3. Cleanup...");
    await supabase.from('payments').delete().eq('id', paymentId);
    await supabase.from('loans').delete().eq('id', loanId);
    await supabase.from('clients').delete().eq('id', clientId);
    await supabase.from('profiles').delete().eq('id', supervisorId);
}

runTest();
