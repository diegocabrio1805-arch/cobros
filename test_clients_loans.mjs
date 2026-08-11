import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  
  const clientIds = [
    '96aa26b3-4fdc-4bb2-881c-9db0f8eb9f29', // Client 1
    '27d6720d-b851-479c-a70a-de8023bc12da', // Client 2
    '7879e658-00aa-43ec-8d26-7e9b0d2d3a33'  // Juana Portillo
  ];
  
  const { data: loans } = await supabase.from('loans').select('id, client_id, status, balance, total_amount, branch_id').in('client_id', clientIds);
  console.log("Loans:", loans);
  
  const { data: clients } = await supabase.from('clients').select('id, name, branch_id, added_by').in('id', clientIds);
  console.log("Clients:", clients);
  
}
main().catch(console.error);
