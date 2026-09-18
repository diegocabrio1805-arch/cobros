import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  
  const { data: clients } = await supabase.from('clients').select('*').ilike('name', '%ALEGRE GARCIA%');
  console.log("Clients:", clients);
  
  if (clients && clients.length > 0) {
    const { data: loans } = await supabase.from('loans').select('*').eq('client_id', clients[0].id);
    console.log("Loans:", loans);
    
    for (const loan of loans) {
      const { data: logs } = await supabase.from('collection_logs').select('*').eq('loan_id', loan.id);
      console.log(`Logs for loan ${loan.id}:`, logs);
    }
  }
}
main().catch(console.error);
