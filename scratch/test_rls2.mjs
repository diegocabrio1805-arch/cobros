import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

async function testQuery(email, password) {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  await supabase.auth.signInWithPassword({ email, password });
  
  const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  console.log(`${email} Profiles: ${profilesCount}`);
  
  const { count: paymentsCount } = await supabase.from('payments').select('*', { count: 'exact', head: true });
  console.log(`${email} Payments: ${paymentsCount}`);
  
  const { count: logsCount } = await supabase.from('collection_logs').select('*', { count: 'exact', head: true });
  console.log(`${email} Logs: ${logsCount}`);
}

async function run() {
  await testQuery('ALTERFINADMI@anexocobro.com', '123456');
  await testQuery('ddiego2025@anexocobro.com', 'Cobros2025');
}

run();
