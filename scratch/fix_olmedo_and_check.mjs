import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  
  // 1. Delete OLMEDO LIBRADA ghost loan
  const ghostLoanId = 'c4abfc8c-eba8-492b-b099-0274a622a8f0';
  const clientId = '804b4b4c-f38f-4c1e-b010-6909f51596a7';
  
  console.log("Deleting ghost loan...");
  const { error: delErr } = await supabase.from('loans').delete().eq('id', ghostLoanId);
  if (delErr) {
    console.error("Error deleting ghost loan:", delErr);
  } else {
    console.log("Ghost loan deleted successfully.");
  }
  
  // Update client to have no active loans
  console.log("Updating client status...");
  const { error: updErr } = await supabase.from('clients').update({
    has_active_loan: false,
    current_loan_id: null
  }).eq('id', clientId);
  
  if (updErr) {
    console.error("Error updating client:", updErr);
  } else {
    console.log("Client updated successfully.");
  }

  // 2. Check for other clients with multiple active loans
  console.log("\nChecking for other clients with multiple active loans...");
  const { data: allActiveLoans, error: fetchErr } = await supabase
    .from('loans')
    .select('id, client_id, status')
    .eq('status', 'Activo');
    
  if (fetchErr) {
    console.error("Error fetching active loans:", fetchErr);
    process.exit(1);
  }
  
  const clientLoanCounts = {};
  allActiveLoans.forEach(l => {
    clientLoanCounts[l.client_id] = (clientLoanCounts[l.client_id] || 0) + 1;
  });
  
  const multipleActive = Object.entries(clientLoanCounts).filter(([_, count]) => count > 1);
  
  if (multipleActive.length > 0) {
    console.log("WARNING: Found other clients with multiple active loans:");
    console.log(multipleActive);
  } else {
    console.log("SUCCESS: No other clients have multiple active loans.");
  }
  
  await supabase.auth.signOut();
}

main().catch(console.error);
