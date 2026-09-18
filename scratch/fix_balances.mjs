import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'ddiego2025@anexocobro.com',
    password: 'Cobros2025'
  });

  // Traer TODOS los préstamos activos donde balance=0 pero hay pagos en logs
  const { data: loans } = await supabase.from('loans')
    .select('id, client_id, total_amount, total_paid, balance, status')
    .in('status', ['Activo', 'En mora', 'ACTIVE', 'DEFAULT']);

  console.log(`Total préstamos activos: ${loans?.length}`);

  let fixed = 0;
  for (const loan of (loans || [])) {
    // Traer logs de pago reales (sin is_opening, sin deleted_at)
    const { data: logs } = await supabase.from('collection_logs')
      .select('id, type, amount, is_opening, deleted_at')
      .eq('loan_id', loan.id)
      .is('deleted_at', null)
      .eq('is_opening', false)
      .in('type', ['PAGO', 'PAYMENT']);

    const sumLogs = (logs || []).reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
    const correctBalance = Math.max(0, loan.total_amount - sumLogs);

    if (Math.abs(correctBalance - (loan.balance || 0)) > 1) {
      console.log(`[FIX] Préstamo ${loan.id}`);
      console.log(`  total_amount: ${loan.total_amount}`);
      console.log(`  balance en BD: ${loan.balance}`);
      console.log(`  suma logs PAGO: ${sumLogs}`);
      console.log(`  balance CORRECTO: ${correctBalance}`);

      const { error } = await supabase.from('loans')
        .update({ balance: correctBalance, total_paid: sumLogs })
        .eq('id', loan.id);
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Corregido a ${correctBalance}`);
        fixed++;
      }
    }
  }

  console.log(`\n=== ${fixed} préstamos corregidos ===`);
}
main().catch(console.error);
