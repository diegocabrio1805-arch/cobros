import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  if (loginErr || !loginData.user) {
    console.error('❌ Failed login:', loginErr?.message);
    process.exit(1);
  }
  console.log(`✅ Logged in as: ${loginData.user.id}`);

  const logId = 'LOG-MIG-L-2025500e-d65c-4603-adb8-ccb936427726';
  const loanId = 'L-2025500e-d65c-4603-adb8-ccb936427726';
  const newAbonoAmount = 627000;

  // 1. Update collection log
  console.log(`Updating collection log ${logId} to amount ${newAbonoAmount}...`);
  const { data: updatedLog, error: logUpdateErr } = await supabase
    .from('collection_logs')
    .update({
      amount: newAbonoAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', logId)
    .select();

  if (logUpdateErr) {
    console.error('❌ Failed to update collection log:', logUpdateErr);
    process.exit(1);
  }
  console.log('✅ Updated collection log successfully:', JSON.stringify(updatedLog, null, 2));

  // 2. Fetch the loan
  const { data: loan, error: loanErr } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (loanErr || !loan) {
    console.error('❌ Failed to fetch loan:', loanErr);
    process.exit(1);
  }

  // 3. Fetch all active collection logs for this loan (now including the updated one)
  const { data: logs, error: logsErr } = await supabase
    .from('collection_logs')
    .select('*')
    .eq('loan_id', loanId)
    .is('deleted_at', null);

  if (logsErr) {
    console.error('❌ Failed to fetch logs for recalculation:', logsErr);
    process.exit(1);
  }

  // 4. Calculate total paid
  let totalPaid = 0;
  logs.forEach(log => {
    if (log.type === 'PAGO' && log.amount) {
      totalPaid += log.amount;
    }
  });

  console.log(`Recalculated total paid from logs: ${totalPaid}`);
  const balance = Math.max(0, loan.total_amount - totalPaid);
  console.log(`Recalculated balance: ${balance}`);

  // 5. Recalculate installments
  const oldInstallments = loan.installments || [];
  const newInstallments = oldInstallments.map(inst => ({
    ...inst,
    paidAmount: 0,
    status: 'Pendiente'
  }));

  let totalToApply = totalPaid;
  for (let i = 0; i < newInstallments.length && totalToApply > 0.01; i++) {
    const inst = newInstallments[i];
    const appliedToInst = Math.round(Math.min(totalToApply, inst.amount) * 100) / 100;
    inst.paidAmount = appliedToInst;
    totalToApply = Math.round((totalToApply - appliedToInst) * 100) / 100;
    inst.status = inst.paidAmount >= inst.amount - 0.01 ? 'Pagado' : (inst.paidAmount > 0 ? 'Parcial' : 'Pendiente');
  }

  const isPaid = balance <= 0.01;
  const newStatus = isPaid ? 'Pagado' : 'Activo';

  console.log(`Updating loan ${loanId} in DB with:`);
  console.log(`- total_paid: ${totalPaid}`);
  console.log(`- balance: ${balance}`);
  console.log(`- status: ${newStatus}`);
  console.log(`- installments fully paid count: ${newInstallments.filter(i => i.status === 'Pagado').length}`);

  // 6. Update loan
  const { data: updatedLoan, error: loanUpdateErr } = await supabase
    .from('loans')
    .update({
      total_paid: totalPaid,
      balance: balance,
      status: newStatus,
      installments: newInstallments,
      updated_at: new Date().toISOString()
    })
    .eq('id', loanId)
    .select();

  if (loanUpdateErr) {
    console.error('❌ Failed to update loan:', loanUpdateErr);
    process.exit(1);
  }

  console.log('✅ Loan updated successfully:', JSON.stringify({
    id: updatedLoan[0].id,
    total_paid: updatedLoan[0].total_paid,
    balance: updatedLoan[0].balance,
    status: updatedLoan[0].status
  }, null, 2));

  await supabase.auth.signOut();
}

main().catch(console.error);
