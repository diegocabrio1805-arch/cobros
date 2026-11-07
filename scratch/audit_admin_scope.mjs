// SOLO LECTURA: mide cuántos registros recibe el Admin vs cuántos son de su sucursal
import { createClient } from '@supabase/supabase-js';

const URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const sb = createClient(URL, KEY);

let auth;
for (const email of ['DDIEGO2025@anexocobro.com', 'ddiego2025@anexocobro.com']) {
  const r = await sb.auth.signInWithPassword({ email, password: 'Cobros2025' });
  if (!r.error) { auth = r.data; console.log('Login OK:', email); break; }
  console.log('Login falló', email, r.error.message);
}
if (!auth) process.exit(1);
const myId = auth.user.id;
console.log('ID Admin:', myId);

const { data: me } = await sb.from('profiles').select('id,name,role').eq('id', myId).single();
console.log('Perfil:', me);

const { data: profs } = await sb.from('profiles').select('id,name,role,managed_by');
const mine = profs.filter(p => p.id === myId || p.managed_by === myId);
console.log(`\nPerfiles visibles: ${profs.length} | Míos (yo + mis cobradores): ${mine.length}`);
const otherAdmins = profs.filter(p => p.id !== myId && (p.role === 'Administrador' || p.role === 'Gerente'));
console.log('Otros Admin/Gerentes visibles:', otherAdmins.map(p => `${p.name} (${p.role})`).join(', ') || 'ninguno');

const count = async (t, f) => {
  let q = sb.from(t).select('id', { count: 'exact', head: true });
  if (f) q = f(q);
  const { count, error } = await q;
  return error ? `ERR ${error.message}` : count;
};

console.log('\nTabla               | Total recibido | Mi branch_id | branch_id NULL | Otras sucursales');
for (const t of ['clients', 'loans', 'payments', 'collection_logs', 'expenses', 'simulated_orders']) {
  const total = await count(t);
  const my = await count(t, q => q.eq('branch_id', myId));
  const nul = await count(t, q => q.is('branch_id', null));
  const other = typeof total === 'number' && typeof my === 'number' && typeof nul === 'number' ? total - my - nul : '?';
  console.log(`${t.padEnd(20)}| ${String(total).padEnd(15)}| ${String(my).padEnd(13)}| ${String(nul).padEnd(15)}| ${other}`);
}
await sb.auth.signOut();
