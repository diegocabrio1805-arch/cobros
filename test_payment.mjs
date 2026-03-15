import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPayment() {
    console.log("Fetching a loan to test payment insertion...");
    const { data: loan, error: loanErr } = await supabase.from('loans').select('*').limit(1).single();
    if (loanErr || !loan) {
        console.error("Failed to fetch loan:", loanErr);
        return;
    }
    
    console.log(`Using Loan ID: ${loan.id}, Client ID: ${loan.client_id}`);
    
    // Test inserting collection_logs
    const logData = {
        id: crypto.randomUUID(),
        loan_id: loan.id,
        client_id: loan.client_id,
        branch_id: loan.branch_id,
        recorded_by: loan.collector_id,
        amount: 50,
        type: 'PAYMENT',
        date: new Date().toISOString(),
        location: null,
        notes: "Test payment from Node",
        is_virtual: false,
        is_renewal: false,
        is_opening: false,
        deleted_at: null,
        updated_at: new Date().toISOString()
    };
    
    console.log("Attempting to insert into collection_logs...");
    const { error: logInsertErr } = await supabase.from('collection_logs').insert(logData);
    if (logInsertErr) {
        console.error("❌ ERROR inserting into collection_logs:");
        console.error(logInsertErr);
    } else {
        console.log("✅ SUCCESS inserting into collection_logs.");
    }

    // Test inserting payments
    const paymentData = {
        id: `pay-${logData.id}-1`,
        loan_id: loan.id,
        client_id: loan.client_id,
        collector_id: loan.collector_id,
        branch_id: loan.branch_id,
        amount: 50,
        date: new Date().toISOString(),
        installment_number: 1,
        location: null,
        is_virtual: false,
        is_renewal: false,
        deleted_at: null,
        updated_at: new Date().toISOString()
    };
    
    console.log("Attempting to insert into payments...");
    const { error: paymentInsertErr } = await supabase.from('payments').insert(paymentData);
    if (paymentInsertErr) {
        console.error("❌ ERROR inserting into payments:");
        console.error(paymentInsertErr);
    } else {
        console.log("✅ SUCCESS inserting into payments.");
    }
    
    // Clean up
    console.log("Cleaning up test data...");
    await supabase.from('payments').delete().eq('id', paymentData.id);
    await supabase.from('collection_logs').delete().eq('id', logData.id);
    console.log("Done.");
}

testPayment();
