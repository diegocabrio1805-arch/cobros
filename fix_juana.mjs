import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: loginData } = await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  
  const loanId = 'L-b7a08057-cd13-45e2-9fa5-cdb81078989b';
  
  // 1. Soft delete all PAGO logs for this loan
  const { data: logs, error: logsErr } = await supabase
    .from('collection_logs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('loan_id', loanId)
    .eq('type', 'PAGO')
    .is('deleted_at', null)
    .select();
    
  if (logsErr) {
    console.error("Error deleting logs:", logsErr);
    process.exit(1);
  }
  
  console.log(`Soft deleted ${logs?.length || 0} PAGO logs.`);
  
  // 2. Fetch loan to reset installments
  const { data: loan, error: loanErr } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();
    
  if (loanErr) {
    console.error("Error fetching loan:", loanErr);
    process.exit(1);
  }
  
  const oldInstallments = loan.installments || [];
  const newInstallments = oldInstallments.map(inst => ({
    ...inst,
    paidAmount: 0,
    status: 'Pendiente'
  }));
  
  // 3. Update loan
  const { data: updatedLoan, error: updateErr } = await supabase
    .from('loans')
    .update({
      total_paid: 0,
      balance: loan.total_amount, // Should be 4050000
      status: 'Activo',
      installments: newInstallments,
      updated_at: new Date().toISOString()
    })
    .eq('id', loanId)
    .select();
    
  if (updateErr) {
    console.error("Error updating loan:", updateErr);
    process.exit(1);
  }
  
  console.log(`Loan updated! New balance: ${updatedLoan[0].balance}, Total Paid: ${updatedLoan[0].total_paid}`);
  
  await supabase.auth.signOut();
}

main().catch(console.error);
