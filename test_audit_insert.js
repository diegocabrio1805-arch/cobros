import fs from 'fs';

// Read .env manually
const envContent = fs.readFileSync('c:/Users/HP/Desktop/cobros/.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

async function run() {
  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

  // First get a valid loan_id and client_id from the DB
  const clientRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=id&limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const clients = await clientRes.json();
  const clientId = clients[0]?.id;

  const loanRes = await fetch(`${SUPABASE_URL}/rest/v1/loans?select=id,branch_id&limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const loans = await loanRes.json();
  const loanId = loans[0]?.id;
  const branchId = loans[0]?.branch_id;

  console.log('clientId:', clientId, 'loanId:', loanId, 'branchId:', branchId);

  // Now test inserting an audit log of type PAGO (bypass method)
  const testRow = {
    id: crypto.randomUUID(),
    loan_id: loanId,
    client_id: clientId,
    branch_id: branchId,
    recorded_by: branchId, // use the admin's id
    collector_id: null,
    type: 'PAGO', // We use PAGO to bypass possible enum restriction
    amount: 999,
    date: new Date().toISOString(),
    location: { lat: 0, lng: 0 },
    notes: '[DELETED_AUDIT] [ORIGIN:2026-03-18T00:00:00.000Z]',
    is_virtual: false,
    is_renewal: false,
    is_opening: false,
    deleted_at: null,
    updated_at: new Date().toISOString()
  };

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/collection_logs`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(testRow)
  });
  
  const statusCode = insertRes.status;
  const text = await insertRes.text();

  console.log('INSERT STATUS:', statusCode);
  console.log('INSERT RESPONSE:', text);

  if (statusCode >= 200 && statusCode < 300) {
    console.log('\n✅ ÉXITO: El registro se insertó correctamente!');
    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/collection_logs?id=eq.${testRow.id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    console.log('🧹 Registro de prueba eliminado.');
  } else {
    console.log('\n❌ ERROR: Supabase rechazó el INSERT. Ver detalles arriba.');
  }
}

run().catch(e => console.error('FATAL:', e));
