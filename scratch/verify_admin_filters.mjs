// SOLO LECTURA: simula las consultas filtradas nuevas del Admin y mide tiempos
import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://samgpnczlznynnfhjjff.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE');
const { data: a } = await sb.auth.signInWithPassword({ email: 'DDIEGO2025@anexocobro.com', password: 'Cobros2025' });
const me = a.user.id;
const checks = {
  clients: sb.from('clients').select('id', { count: 'exact', head: true }).eq('branch_id', me),
  loans: sb.from('loans').select('id', { count: 'exact', head: true }).eq('branch_id', me),
  profiles: sb.from('profiles').select('id', { count: 'exact', head: true }).or(`id.eq.${me},managed_by.eq.${me}`),
  expenses: sb.from('expenses').select('id', { count: 'exact', head: true }).eq('branch_id', me),
  isolated_expenses: sb.from('isolated_expenses').select('id', { count: 'exact', head: true }).eq('branch_id', me),
  deleted_items: sb.from('deleted_items').select('id', { count: 'exact', head: true }).or(`branch_id.eq.${me},branch_id.is.null`),
  simulated_orders: sb.from('simulated_orders').select('id', { count: 'exact', head: true }).eq('branch_id', me),
  pago_eliminado: sb.from('collection_logs').select('id', { count: 'exact', head: true }).eq('type', 'PAGO_ELIMINADO').eq('branch_id', me),
};
for (const [k, q] of Object.entries(checks)) {
  const { count, error } = await q;
  console.log(k.padEnd(18), error ? `❌ ERROR: ${error.message}` : `✅ ${count}`);
}
// prueba cross-branch con tanda de 100 ids
const { data: ids } = await sb.from('clients').select('id').eq('branch_id', me);
let cp = 0, cl = 0;
const t0 = Date.now();
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100).map(c => c.id);
  const p = await sb.from('payments').select('id').neq('branch_id', me).in('client_id', chunk);
  const l = await sb.from('collection_logs').select('id').neq('branch_id', me).in('client_id', chunk);
  if (p.error || l.error) console.log('❌ cross error', p.error?.message, l.error?.message);
  cp += p.data?.length || 0; cl += l.data?.length || 0;
}
console.log(`cross-branch: pagos ${cp}, logs ${cl} (${Date.now() - t0} ms, ${ids.length} clientes)`);
await sb.auth.signOut();
