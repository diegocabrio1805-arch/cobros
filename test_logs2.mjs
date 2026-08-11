import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  
  const loanId = 'L-96aa26b3-4fdc-4bb2-881c-9db0f8eb9f29';
  const { data: logs } = await supabase.from('collection_logs').select('id, amount, date').eq('loan_id', loanId);
  
  console.log("All logs for loan:", logs);
}
main().catch(console.error);
