import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
// Service Role Key - bypasses RLS, accede a TODOS los datos del sistema
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE2NTU2NCwiZXhwIjoyMDg3NzQxNTY0fQ.5nN1gCgX7_4K0Rk2QZ-tAOFhP9pS1hVMBXX8mZqSGy4';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('=== FIX GLOBAL DE SALDOS - TODOS LOS PRÉSTAMOS ACTIVOS ===\n');

  // 1. Traer TODOS los préstamos activos del sistema (sin filtro de usuario)
  const { data: loans, error: loansErr } = await supabase
    .from('loans')
    .select('id, client_id, branch_id, total_amount, total_paid, balance, status')
    .in('status', ['Activo', 'En mora', 'ACTIVE', 'DEFAULT'])
    .is('deleted_at', null);

  if (loansErr) { console.error('Error fetching loans:', loansErr); return; }
  console.log(`Total préstamos activos en el sistema: ${loans.length}\n`);

  // 2. Traer TODOS los logs de pago del sistema de una sola vez
  const { data: allLogs, error: logsErr } = await supabase
    .from('collection_logs')
    .select('id, loan_id, type, amount, is_opening, deleted_at')
    .in('type', ['PAGO', 'PAYMENT'])
    .is('deleted_at', null)
    .eq('is_opening', false);

  if (logsErr) { console.error('Error fetching logs:', logsErr); return; }
  console.log(`Total logs de pago: ${allLogs.length}\n`);

  // 3. Agrupar logs por loan_id para acceso rápido
  const logsByLoan = {};
  for (const log of allLogs) {
    if (!logsByLoan[log.loan_id]) logsByLoan[log.loan_id] = [];
    logsByLoan[log.loan_id].push(log);
  }

  // 4. Calcular y corregir
  let fixed = 0, skipped = 0, errors = 0;
  const updates = [];

  for (const loan of loans) {
    const loanLogs = logsByLoan[loan.id] || [];
    const sumLogs = loanLogs.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
    const correctBalance = Math.max(0, loan.total_amount - sumLogs);
    const currentBalance = loan.balance || 0;

    // Solo corregir si hay diferencia de más de $1
    if (Math.abs(correctBalance - currentBalance) > 1) {
      updates.push({ id: loan.id, balance: correctBalance, total_paid: sumLogs });
    } else {
      skipped++;
    }
  }

  console.log(`Préstamos a corregir: ${updates.length}`);
  console.log(`Préstamos ya correctos: ${skipped}\n`);

  // 5. Actualizar en lotes de 20 para ser ultrarrápido
  const BATCH = 20;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map(async (u) => {
      const { error } = await supabase
        .from('loans')
        .update({ balance: u.balance, total_paid: u.total_paid })
        .eq('id', u.id);
      if (error) {
        console.log(`  ❌ ${u.id}: ${error.message}`);
        errors++;
      } else {
        fixed++;
        process.stdout.write(`\r  ✅ Corregidos: ${fixed}/${updates.length}`);
      }
    }));
  }

  console.log(`\n\n=== RESULTADO FINAL ===`);
  console.log(`✅ Corregidos: ${fixed}`);
  console.log(`⏭️  Ya correctos: ${skipped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log('\n¡Listo! Recargá la app para ver los saldos actualizados.');
}

main().catch(console.error);
