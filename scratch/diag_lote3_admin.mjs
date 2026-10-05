import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, ANON_KEY);
const { error: e } = await supabase.auth.signInWithPassword({ email: 'ddiego2025@anexocobro.com', password: 'Cobros2025' });
if (e) { console.log('login', e.message); process.exit(1); }

const oneYearAgo = new Date(Date.now() - 365 * 864e5).toISOString();

async function offsetTest(table, pages) {
  for (let p = 0; p < pages; p++) {
    const t = Date.now();
    const { data, error } = await supabase.from(table).select('*').order('updated_at', { ascending: true }).gt('updated_at', oneYearAgo).range(p * 500, p * 500 + 499);
    console.log(`[OFFSET] ${table} page ${p}: ${error ? 'ERR ' + error.code + ' ' + error.message : data.length + ' rows'} ${Date.now() - t}ms`);
    if (error || data.length < 500) break;
  }
}
async function keysetTest(table, size) {
  let last = null, total = 0, n = 0; const t0 = Date.now();
  while (true) {
    let q = supabase.from(table).select('*').gt('updated_at', oneYearAgo).order('id', { ascending: true }).limit(size);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) { console.log(`[KEYSET] ${table} ERR ${error.code} ${error.message}`); return; }
    total += data.length; n++;
    if (data.length < size) break;
    last = data[data.length - 1].id;
  }
  console.log(`[KEYSET] ${table}: ${total} rows, ${n} requests, ${Date.now() - t0}ms`);
}
await offsetTest('payments', 40);
await offsetTest('collection_logs', 40);
await keysetTest('payments', 1000);
await keysetTest('collection_logs', 1000);
