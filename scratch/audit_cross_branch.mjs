// SOLO LECTURA: ¿hay pagos/logs de clientes del Admin con branch_id distinto?
import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://samgpnczlznynnfhjjff.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE');
const { data: a } = await sb.auth.signInWithPassword({ email: 'DDIEGO2025@anexocobro.com', password: 'Cobros2025' });
const myId = a.user.id;

const fetchAll = async (t, cols, f) => {
  let out = [], last = null;
  while (true) {
    let q = sb.from(t).select(cols).order('id').limit(1000);
    if (f) q = f(q);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
    last = data[data.length - 1].id;
  }
  return out;
};
const myClients = new Set((await fetchAll('clients', 'id', q => q.eq('branch_id', myId))).map(c => c.id));
const myLoans = new Set((await fetchAll('loans', 'id', q => q.eq('branch_id', myId))).map(c => c.id));
const loansOtherOfMyClients = await fetchAll('loans', 'id,client_id,branch_id', q => q.neq('branch_id', myId));
console.log('Préstamos de MIS clientes con otro branch_id:', loansOtherOfMyClients.filter(l => myClients.has(l.client_id)).length);
for (const t of ['payments', 'collection_logs']) {
  const other = await fetchAll(t, 'id,client_id,loan_id,branch_id', q => q.neq('branch_id', myId));
  const cross = other.filter(r => myClients.has(r.client_id) || myLoans.has(r.loan_id));
  console.log(`${t}: registros de MIS clientes/préstamos con otro branch_id: ${cross.length}`, cross.slice(0, 3));
}
const { data: profs } = await sb.from('profiles').select('id,name,role,managed_by').or(`id.eq.${myId},managed_by.eq.${myId}`);
console.log('Mis perfiles:', profs.map(p => `${p.name} (${p.role})`).join(', '));
await sb.auth.signOut();
