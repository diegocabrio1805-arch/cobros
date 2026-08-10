import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
  await supabase.auth.signInWithPassword({ email: 'DDANTE1983@anexocobro.com', password: 'Cobros2026' });

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, branch_id, role, name')
    .or('name.ilike.%zona4%,name.ilike.%zon2%');

  console.log("Users:", users);

  const { data: policies, error: pError } = await supabase
    .rpc('get_table_policies', { p_table_name: 'simulated_orders' });
    
  console.log("Policies:", policies, pError);
}

testQuery();
