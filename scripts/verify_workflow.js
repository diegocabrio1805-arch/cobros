
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    console.log("--- Starting Workflow Verification ---");

    const supervisorId = `test-sup-${Date.now()}`;
    const clientId = `test-client-${Date.now()}`;
    const loanId = `test-loan-${Date.now()}`;
    const paymentId = `test-pay-${Date.now()}`;

    // 1. Create Supervisor (Profile)
    console.log(`1. Creating Supervisor (ID: ${supervisorId})...`);
    const { error: err1 } = await supabase.from('profiles').insert({
        id: supervisorId,
        name: 'Supervisor Test',
        username: supervisorId,
        password: '123',
        role: 'Gerente',
        blocked: false
    });
    if (err1) { console.error("FAIL 1:", err1); return; }
    console.log("SUCCESS: Supervisor created.");

    // 2. Create Client (Linked to Supervisor)
    console.log(`2. Creating Client (ID: ${clientId}, Branch: ${supervisorId})...`);
    const { error: err2 } = await supabase.from('clients').insert({
        id: clientId,
        name: 'Client Test',
        document_id: '12345',
        phone: '555',
        address: 'Test Address',
        credit_limit: 1000,
        branch_id: supervisorId, // THIS WAS THE FAILURE POINT
        is_active: true,
        created_at: new Date().toISOString()
    });
    if (err2) { console.error("FAIL 2:", err2); return; }
    console.log("SUCCESS: Client created.");

    // 3. Create Loan
    console.log(`3. Creating Loan (ID: ${loanId})...`);
    const { error: err3 } = await supabase.from('loans').insert({
        id: loanId,
        client_id: clientId,
        branch_id: supervisorId,
        principal: 100000,
        interest_rate: 20,
        total_installments: 30,
        installment_value: 4000,
        total_amount: 120000,
        status: 'Activo',
        frequency: 'Diaria',
        created_at: new Date().toISOString()
    });
    if (err3) { console.error("FAIL 3:", err3); return; }
    console.log("SUCCESS: Loan created.");

    // 4. Create Payment
    console.log(`4. Creating Payment (ID: ${paymentId})...`);
    const { error: err4 } = await supabase.from('payments').insert({
        id: paymentId,
        loan_id: loanId,
        client_id: clientId,
        branch_id: supervisorId,
        amount: 4000,
        date: new Date().toISOString(),
        installment_number: 1
    });
    if (err4) { console.error("FAIL 4:", err4); return; }
    console.log("SUCCESS: Payment created.");

    console.log("--- CLEANUP ---");
    await supabase.from('payments').delete().eq('id', paymentId);
    await supabase.from('loans').delete().eq('id', loanId);
    await supabase.from('clients').delete().eq('id', clientId);
    await supabase.from('profiles').delete().eq('id', supervisorId);
    console.log("Cleanup done. Test Passed!");
}

runTest();
