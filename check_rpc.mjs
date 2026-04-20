import fetch from 'node-fetch';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

async function check() {
  const res = await fetch('https://samgpnczlznynnfhjjff.supabase.co/rest/v1/rpc/handle_loan_renewal_v1', {
    method: 'POST',
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_new_loan_id: '00000000-0000-0000-0000-000000000000', p_client_id: '00000000-0000-0000-0000-000000000000', p_collector_id: '00000000-0000-0000-0000-000000000000', p_principal: 0, p_interest_rate: 0, p_total_installments: 0, p_frequency: 'daily', p_total_amount: 0, p_installment_value: 0, p_installments: [], p_previous_loan_ids: [], p_branch_id: '00000000-0000-0000-0000-000000000000' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Respuesta:', text);
  if (res.status === 404 || text.toLowerCase().includes('not found')) {
    console.log('\n>>> FALTA APLICAR: blindaje_renovacion.sql en Supabase <<<');
  } else {
    console.log('\n>>> OK: La funcion handle_loan_renewal_v1 EXISTE en Supabase <<<');
  }
}
check().catch(e => console.error('Error:', e.message));
