// diagnostico_olga_logs.mjs
// Diagnostica por qué el cobrador no ve todos los pagos de Olga Collante Gómez
// Uso: node diagnostico_olga_logs.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 DIAGNÓSTICO: Pagos de Olga Collante Gómez\n');

// 1. Buscar a Olga en la tabla clients
const { data: clients, error: clientErr } = await supabase
  .from('clients')
  .select('id, name, branch_id, added_by')
  .ilike('name', '%olga%collante%');

if (clientErr) { console.error('Error buscando cliente:', clientErr); process.exit(1); }
console.log('👤 Cliente encontrado:');
clients.forEach(c => console.log(`   ID: ${c.id} | Branch: ${c.branch_id} | AddedBy: ${c.added_by}`));

if (!clients.length) { console.log('❌ No se encontró el cliente'); process.exit(1); }
const clientId = clients[0].id;
const branchId = clients[0].branch_id;

// 2. Buscar todos los préstamos de Olga
const { data: loans, error: loanErr } = await supabase
  .from('loans')
  .select('id, status, collector_id, branch_id, total_amount, installment_value, total_installments, created_at, is_renewal')
  .eq('client_id', clientId)
  .order('created_at', { ascending: false });

if (loanErr) { console.error('Error buscando préstamos:', loanErr); process.exit(1); }
console.log(`\n📋 Préstamos (${loans.length} total):`);
loans.forEach(l => console.log(`   ID: ${l.id}\n   Status: ${l.status} | Collector: ${l.collector_id} | Branch: ${l.branch_id}\n   Renovación: ${l.is_renewal} | Creado: ${l.created_at?.slice(0,10)}\n   Cuota: ${l.installment_value} | Total: ${l.total_installments} cuotas\n`));

const loanIds = loans.map(l => l.id);

// 3. Buscar TODOS los collection_logs de Olga (por cliente o por préstamo)
const { data: logsByClient, error: logErr1 } = await supabase
  .from('collection_logs')
  .select('id, loan_id, client_id, type, amount, date, recorded_by, branch_id, is_opening, deleted_at')
  .eq('client_id', clientId)
  .order('date', { ascending: false });

console.log(`\n📊 Logs por client_id (${logsByClient?.length ?? 0} total):`);
(logsByClient || []).forEach(l => {
  const flag = l.is_opening ? '[APERTURA]' : '';
  const del = l.deleted_at ? '[ELIMINADO]' : '';
  console.log(`   ${l.date?.slice(0,10)} | ${l.type} | $${l.amount} | LoanID: ${l.loan_id?.slice(0,8)}... | RecordedBy: ${l.recorded_by?.slice(0,8)}... | Branch: ${l.branch_id} ${flag}${del}`);
});

// 4. Buscar logs por loan_id (por si tienen loan_id pero no client_id)
const { data: logsByLoan, error: logErr2 } = await supabase
  .from('collection_logs')
  .select('id, loan_id, client_id, type, amount, date, recorded_by, branch_id, is_opening, deleted_at')
  .in('loan_id', loanIds)
  .order('date', { ascending: false });

const logsByLoanOnly = (logsByLoan || []).filter(l => !l.client_id || l.client_id !== clientId);
console.log(`\n⚠️  Logs con loan_id de Olga pero SIN client_id correcto (${logsByLoanOnly.length}):`);
logsByLoanOnly.forEach(l => {
  console.log(`   ${l.date?.slice(0,10)} | ${l.type} | $${l.amount} | client_id: ${l.client_id} | LoanID: ${l.loan_id?.slice(0,8)}...`);
});

// 5. Buscar el perfil del cobrador (zona3 / FABIANARRUA2)
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, name, role, managed_by')
  .ilike('name', '%fabian%');

console.log('\n👷 Cobrador FABIANARRUA2:');
(profiles || []).forEach(p => console.log(`   ID: ${p.id} | Role: ${p.role} | ManagedBy: ${p.managed_by}`));

// 6. RESUMEN DEL PROBLEMA
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📌 RESUMEN:');
const pagosReales = (logsByClient || []).filter(l => l.type === 'PAYMENT' && !l.is_opening && !l.deleted_at);
const totalPagado = pagosReales.reduce((s, l) => s + (l.amount || 0), 0);
const cuotaBase = loans[0]?.installment_value || 1;
console.log(`   Total pagos reales encontrados: ${pagosReales.length}`);
console.log(`   Total pagado: $${totalPagado.toLocaleString()}`);
console.log(`   Cuotas calculadas: ${(totalPagado / cuotaBase).toFixed(1)} / ${loans[0]?.total_installments}`);

// Verificar branch_id de los logs vs del cliente
const logsConBranch = (logsByClient || []).filter(l => l.branch_id);
const logsConOtroBranch = logsConBranch.filter(l => l.branch_id !== branchId);
console.log(`\n   Logs con branch_id diferente al cliente: ${logsConOtroBranch.length}`);
logsConOtroBranch.forEach(l => console.log(`     → ${l.date?.slice(0,10)} | branch_id: ${l.branch_id} (cliente tiene: ${branchId})`));

const logsRecordedByOtro = (logsByClient || []).filter(l => !loans.some(loan => l.recorded_by === loan.collector_id));
console.log(`\n   Logs registrados por alguien que NO es el cobrador del préstamo: ${logsRecordedByOtro.length}`);
logsRecordedByOtro.slice(0, 5).forEach(l => console.log(`     → ${l.date?.slice(0,10)} | RecordedBy: ${l.recorded_by}`));

console.log('\n✅ Diagnóstico completo.\n');
