import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

// Credenciales de todos los administradores conocidos del sistema
const ADMINS = [
  { email: 'ALTERFINADMI@anexocobro.com', password: '123456' },
  { email: 'ddiego2025@anexocobro.com', password: 'Cobros2025' },
];

async function checkAdmin(email, password) {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) { console.log(`  ❌ Login fallido: ${loginErr.message}`); return []; }

  const { data: loans } = await supabase.from('loans')
    .select('id, client_id, total_amount, total_paid, balance, status')
    .in('status', ['Activo', 'En mora', 'ACTIVE', 'DEFAULT'])
    .is('deleted_at', null);

  const problems = [];
  for (const loan of (loans || [])) {
    // Traer logs de pago reales
    const { data: logs } = await supabase.from('collection_logs')
      .select('id, type, amount, is_opening, deleted_at, notes')
      .eq('loan_id', loan.id)
      .is('deleted_at', null)
      .eq('is_opening', false)
      .in('type', ['PAGO', 'PAYMENT']);

    const sumReal = (logs || [])
      .filter(l => !String(l.id).startsWith('LOG-MIG-'))
      .reduce((acc, l) => acc + (Number(l.amount) || 0), 0);

    const sumWithMig = (logs || [])
      .reduce((acc, l) => acc + (Number(l.amount) || 0), 0);

    const balanceWithMig = Math.max(0, loan.total_amount - sumWithMig);
    const balanceWithoutMig = Math.max(0, loan.total_amount - sumReal);

    // Problema: el balance calculado con LOG-MIG da 0 o muy bajo
    // pero el balance sin LOG-MIG es significativamente mayor
    if (balanceWithMig <= 1 && balanceWithoutMig > 100) {
      // Traer nombre del cliente
      const { data: client } = await supabase.from('clients')
        .select('name').eq('id', loan.client_id).single();
      
      problems.push({
        loanId: loan.id,
        clientName: client?.name || 'Desconocido',
        total_amount: loan.total_amount,
        balanceWithMig,
        balanceWithoutMig,
        sumReal,
        sumWithMig
      });
    }
  }
  return problems;
}

async function main() {
  console.log('=== DIAGNÓSTICO GLOBAL - CLIENTES CON SALDO BLOQUEADO POR LOG-MIG ===\n');
  
  for (const admin of ADMINS) {
    console.log(`\n--- Usuario: ${admin.email} ---`);
    const problems = await checkAdmin(admin.email, admin.password);
    
    if (problems.length === 0) {
      console.log('  ✅ Sin problemas detectados');
    } else {
      console.log(`  ⚠️  ${problems.length} clientes con problema:`);
      for (const p of problems) {
        console.log(`\n  Cliente: ${p.clientName}`);
        console.log(`  Préstamo: ${p.loanId}`);
        console.log(`  Total crédito: $${p.total_amount.toLocaleString()}`);
        console.log(`  Pagos reales (sin LOG-MIG): $${p.sumReal.toLocaleString()}`);
        console.log(`  Saldo real (sin LOG-MIG):   $${p.balanceWithoutMig.toLocaleString()}`);
        console.log(`  Saldo con LOG-MIG (erróneo): $${p.balanceWithMig.toLocaleString()}`);
      }
    }
  }

  console.log('\n=== FIN DEL DIAGNÓSTICO ===');
}

main().catch(console.error);
