import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, ANON_KEY);
await supabase.auth.signInWithPassword({ email: 'ddiego2025@anexocobro.com', password: 'Cobros2025' });

const { data: profs } = await supabase.from('profiles').select('id,name,role').eq('role', 'Cobrador');
console.log('cobradores:', profs?.length);
const oneYearAgo = new Date(Date.now() - 365 * 864e5).toISOString();

async function oldWay(rpc, id) {
  const t = Date.now(); let n = 0, p = 0;
  while (true) {
    const { data, error } = await supabase.rpc(rpc, { p_collector_id: id }).select('*').order('updated_at', { ascending: true }).gt('updated_at', oneYearAgo).range(p * 500, p * 500 + 499);
    if (error) return `ERR ${error.code} ${error.message} tras ${n} filas`;
    n += data.length; if (data.length < 500) break; p++;
  }
  return `${n} filas ${Date.now() - t}ms`;
}
async function newWay(rpc, id) {
  const t = Date.now(); let n = 0, last = null, req = 0;
  while (true) {
    let q = supabase.rpc(rpc, { p_collector_id: id }).select('*').gt('updated_at', oneYearAgo).order('id', { ascending: true }).limit(1000);
    if (last) q = q.gt('id', last);
    const { data, error } = await q; req++;
    if (error) return `ERR ${error.code} ${error.message} tras ${n} filas`;
    n += data.length; if (data.length < 1000) break; last = data[data.length - 1].id;
  }
  return `${n} filas, ${req} req, ${Date.now() - t}ms`;
}
for (const c of (profs || []).slice(0, 4)) {
  for (const rpc of ['get_collector_payments', 'get_collector_logs']) {
    console.log(c.name, rpc, '| OLD:', await oldWay(rpc, c.id), '| NEW:', await newWay(rpc, c.id));
  }
}
