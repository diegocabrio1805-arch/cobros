import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  if (loginErr || !loginData.user) {
    console.error('❌ Failed login:', loginErr?.message);
    process.exit(1);
  }

  // Find the client
  const { data: clients, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', '%MALDONADO%CARMEN%')
    .is('deleted_at', null);

  if (clientErr) {
    console.error('Error fetching client:', clientErr);
    process.exit(1);
  }

  console.log(`Found ${clients.length} matching clients:`);
  console.log(JSON.stringify(clients, null, 2));

  if (clients.length === 0) {
    console.log('No client found. Exiting.');
    process.exit(1);
  }

  const client = clients[0];

  // Find loans for this client
  const { data: loans, error: loansErr } = await supabase
    .from('loans')
    .select('*')
    .eq('client_id', client.id)
    .is('deleted_at', null);

  if (loansErr) {
    console.error('Error fetching loans:', loansErr);
    process.exit(1);
  }

  console.log(`Found ${loans.length} loans for client:`);
  console.log(JSON.stringify(loans, null, 2));

  if (loans.length === 0) {
    console.log('No active loans found. Exiting.');
    process.exit(1);
  }

  const loan = loans[0];

  // Find collection logs for this loan
  const { data: logs, error: logsErr } = await supabase
    .from('collection_logs')
    .select('*')
    .eq('loan_id', loan.id)
    .is('deleted_at', null)
    .order('date', { ascending: false });

  if (logsErr) {
    console.error('Error fetching collection logs:', logsErr);
    process.exit(1);
  }

  console.log(`Found ${logs.length} collection logs for loan:`);
  let sumActive = 0;
  logs.forEach(log => {
    console.log(`- ID: ${log.id} | Date: ${log.date} | Type: ${log.type} | Amount: ${log.amount} | Notes: ${log.notes}`);
    if (log.type === 'PAGO' && log.amount) {
      sumActive += log.amount;
    }
  });
  console.log(`Sum of active PAGO logs: ${sumActive}`);

  await supabase.auth.signOut();
}

main().catch(console.error);
