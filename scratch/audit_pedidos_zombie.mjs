import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const ADMINS = [
  { email: 'ALTERFINADMI@anexocobro.com', password: '123456' },
  { email: 'ddiego2025@anexocobro.com',   password: 'Cobros2025' },
];

async function fetchAll(q) {
  let all = [], from = 0, size = 1000;
  while (true) {
    const { data, error } = await q().range(from, from + size - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < size) break;
    from += size;
  }
  return all;
}

for (const { email, password } of ADMINS) {
  console.log(`\n=== ${email} ===`);
  const sb = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { console.log('  Login fallido:', error.message); continue; }

  const orders = await fetchAll(() => sb.from('simulated_orders').select('id, client_id, client_name, principal, created_at'));
  const loans = await fetchAll(() => sb.from('loans').select('id, client_id, created_at, status, deleted_at'));

  let zombies = 0, pending = 0;
  for (const o of orders) {
    const margin = new Date(new Date(o.created_at).getTime() - 12 * 3600 * 1000);
    const newer = loans.find(l => l.client_id === o.client_id && new Date(l.created_at) >= margin);
    if (newer) { zombies++; console.log(`  ZOMBIE  ${o.created_at.slice(0,10)}  ${o.client_name}  (préstamo ${newer.created_at.slice(0,10)} ${newer.status}${newer.deleted_at ? ' BORRADO' : ''})`); }
    else pending++;
  }
  console.log(`  Total pedidos en Supabase: ${orders.length} | Zombies (ya tienen crédito): ${zombies} | Realmente pendientes: ${pending}`);
}

