import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  
  const { data: clients } = await supabase.from('clients').select('id, name, branch_id').ilike('name', '%DIAZ RIOS, FERMINA%');
  console.log("All DIAZ RIOS clients:", clients);
  
  const cIds = clients.map(c => c.id);
  const { data: loans } = await supabase.from('loans').select('id, client_id, status, balance, total_amount').in('client_id', cIds);
  console.log("All their loans:", loans);
  
}
main().catch(console.error);
