import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const ADMINS = [
  { email: 'ALTERFINADMI@anexocobro.com', password: '123456' },
  { email: 'ddiego2025@anexocobro.com',   password: 'Cobros2025' },
];

async function fixAdmin(email, password) {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) { console.log(`  ❌ Login fallido: ${loginErr.message}`); return; }

  // Traer todos los préstamos activos
  const { data: loans } = await supabase.from('loans')
    .select('id, total_amount, status')
    .in('status', ['Activo', 'En mora', 'ACTIVE', 'DEFAULT'])
    .is('deleted_at', null);

  // Traer todos los LOG-MIG del sistema de una sola vez
  const { data: migLogs } = await supabase.from('collection_logs')
    .select('id, loan_id, amount')
    .like('id', 'LOG-MIG-%')
    .is('deleted_at', null);

  const loanMap = {};
  for (const l of (loans || [])) loanMap[l.id] = l;

  let fixed = 0;
  for (const log of (migLogs || [])) {
    const loan = loanMap[log.loan_id];
    if (!loan) continue;

    const logAmt = Number(log.amount) || 0;
    const totalAmt = Number(loan.total_amount) || 0;

    // Si el LOG-MIG cubre 95% o más del total → fue mal seteado (guardó lo que DEBE, no lo que pagó)
    if (logAmt >= totalAmt * 0.95 && logAmt > 0) {
      const { error } = await supabase.from('collection_logs')
        .update({ amount: 0 })
        .eq('id', log.id);
      if (error) {
        console.log(`  ❌ Error en ${log.id}: ${error.message}`);
      } else {
        fixed++;
        process.stdout.write(`\r  ✅ LOG-MIG corregidos: ${fixed}`);
      }
    }
  }
  return fixed;
}

async function main() {
  console.log('=== FIX LOG-MIG INCORRECTOS - TODOS LOS ADMINISTRADORES ===\n');
  let total = 0;
  for (const admin of ADMINS) {
    console.log(`\n--- ${admin.email} ---`);
    const fixed = await fixAdmin(admin.email, admin.password);
    console.log(`\n  Total corregidos: ${fixed}`);
    total += fixed || 0;
  }
  console.log(`\n=== TOTAL GLOBAL CORREGIDO: ${total} LOG-MIG ===`);
  console.log('Recargá la app para ver los saldos correctos.');
}
main().catch(console.error);
