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
  if (loginErr) { console.log(`[!] Login fallido: ${loginErr.message}`); return; }

  const branchId = (await supabase.auth.getUser()).data.user.id;

  // Traer préstamos con el bug de Pagado (balance 0)
  const { data: loans } = await supabase.from('loans')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'Pagado')
    .eq('balance', 0)
    .is('deleted_at', null);

  console.log(`[+] Encontrados ${loans?.length || 0} préstamos sospechosos.`);
  let fixed = 0;

  for (const loan of (loans || [])) {
    // Buscar log de migración
    const { data: logs } = await supabase.from('collection_logs')
      .select('*')
      .eq('loan_id', loan.id)
      .ilike('notes', '%MIGRACIÓN EXCEL%');
      
    if (!logs || logs.length === 0) continue;

    const migLog = logs[0];
    const totalPaid = migLog.amount;
    const balance = Math.max(0, loan.total_amount - totalPaid);
    const status = balance <= 0.01 ? 'Pagado' : 'Activo';

    // Si ya estaba en 0 y realmente es 0, no hay bug de cálculo de saldo, pero igual arreglamos raw_data
    let remaining = totalPaid;
    
    // El frontend guarda los installments en raw_data? No, no hay installments en loans?
    // Oh, en Supabase los installments NO están en 'loans'. El frontend los genera al vuelo en el selector!
    // Wait, the API response for 'loans' didn't show 'installments'! It only had 'total_installments', 'frequency', 'total_amount'.
    // If the backend doesn't store installments, we ONLY need to fix balance, status, and total_paid!

    const { error } = await supabase.from('loans')
      .update({ balance, status, total_paid: totalPaid })
      .eq('id', loan.id);
      
    if (error) {
      console.error(`[-] Error fijando préstamo ${loan.id}:`, error.message);
    } else {
      fixed++;
    }
  }
  return fixed;
}

async function main() {
  console.log('=== FIX PRÉSTAMOS PAGADOS (EXCEL BUG) ===');
  let total = 0;
  for (const admin of ADMINS) {
    console.log(`\n--- ${admin.email} ---`);
    const f = await fixAdmin(admin.email, admin.password);
    console.log(`Arreglados: ${f}`);
    total += f || 0;
  }
  console.log(`\nTOTAL GLOBAL: ${total}`);
}

main().catch(console.error);
