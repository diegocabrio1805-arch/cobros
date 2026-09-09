import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: loginData } = await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  
  console.log("Fetching client OLMEDO LIBRADA...");
  const { data: client, error: err1 } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', '%OLMEDO LIBRADA%')
    .single();
    
  if (err1) {
    console.error("Error fetching client:", err1);
    process.exit(1);
  }
  console.log("Client ID:", client.id);
  console.log("Client current_loan_id:", client.current_loan_id);
  
  console.log("\nFetching loans for client...");
  const { data: loans, error: err2 } = await supabase
    .from('loans')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });
    
  if (err2) {
    console.error("Error fetching loans:", err2);
    process.exit(1);
  }
  
  loans.forEach(loan => {
    console.log(`Loan ID: ${loan.id} | Amount: ${loan.amount} | Created: ${loan.created_at} | Status: ${loan.status}`);
  });
  
  console.log("\nFetching collection_logs for client...");
  const { data: logs, error: err3 } = await supabase
    .from('collection_logs')
    .select('*')
    .eq('client_id', client.id)
    .order('date', { ascending: false })
    .limit(20);
    
  if (err3) {
    console.error("Error fetching logs:", err3);
    process.exit(1);
  }
  
  logs.forEach(log => {
    console.log(`Log ID: ${log.id} | Type: ${log.type} | Amount: ${log.amount} | Date: ${log.date} | Loan: ${log.loan_id} | Ref: ${log.reference_id || 'null'}`);
  });
  
  await supabase.auth.signOut();
}

main().catch(console.error);
