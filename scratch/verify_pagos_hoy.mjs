import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, ANON_KEY);
await supabase.auth.signInWithPassword({ email: 'ddiego2025@anexocobro.com', password: 'Cobros2025' });

const since = '2026-10-05T03:00:00.000Z'; // 00:00 hora Paraguay
const { data: logs, error: e1 } = await supabase.from('collection_logs').select('id,loan_id,client_id,amount,type,date,recorded_by,deleted_at,updated_at,created_at').gte('date', since).order('date', { ascending: true }).limit(2000);
const { data: pays, error: e2 } = await supabase.from('payments').select('id,loan_id,amount,date,deleted_at,created_at').gte('created_at', since).limit(2000);
if (e1 || e2) console.log('ERR', e1?.message, e2?.message);

const payLogs = logs.filter(l => l.type === 'PAYMENT');
console.log('Logs de hoy:', logs.length, '| PAYMENT:', payLogs.length, '| borrados:', payLogs.filter(l => l.deleted_at).length);
const byType = {}; logs.forEach(l => byType[l.type] = (byType[l.type] || 0) + 1); console.log('Por tipo:', byType);

// Duplicados: mismo loan + mismo monto en < 3 min
let dups = [];
const live = payLogs.filter(l => !l.deleted_at);
for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
  const a = live[i], b = live[j];
  if (a.loan_id === b.loan_id && Number(a.amount) === Number(b.amount) && Math.abs(new Date(a.date) - new Date(b.date)) < 180000) dups.push([a.id, b.id, a.loan_id, a.amount, a.date, b.date]);
}
console.log('Posibles pagos duplicados (mismo credito+monto <3min):', dups.length);
dups.slice(0, 10).forEach(d => console.log('  ', d.join(' | ')));

const zero = live.filter(l => !(Number(l.amount) > 0));
console.log('Pagos con monto 0/nulo:', zero.length);

// Por hora (Paraguay UTC-3)
const hours = {}; live.forEach(l => { const h = (new Date(l.date).getUTCHours() + 21) % 24; hours[h] = (hours[h] || 0) + 1; });
console.log('Pagos por hora local:', hours);

// Pagos en 'payments' sin log asociado y viceversa (por loan + monto)
console.log('Registros en payments creados hoy:', pays.length);
const payKey = new Set(pays.filter(p => !p.deleted_at).map(p => `${p.loan_id}|${Number(p.amount)}`));
const logKey = new Set(live.map(l => `${l.loan_id}|${Number(l.amount)}`));
console.log('Logs PAYMENT sin registro en payments:', [...logKey].filter(k => !payKey.has(k)).length);
console.log('payments sin log PAYMENT:', [...payKey].filter(k => !logKey.has(k)).length);
