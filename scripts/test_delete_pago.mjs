import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envContent = fs.readFileSync('c:/Users/HP/Desktop/cobros/.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL; 
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing SUPABASE KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing insert PAGO_ELIMINADO...");
  const logToInsert = {
    id: 'test-log-audit-123',
    loan_id: 'test-loan-id',
    client_id: 'test-client-id',
    branch_id: 'test-branch-id',
    type: 'PAGO_ELIMINADO',
    amount: 100,
    date: new Date().toISOString(),
    notes: JSON.stringify({
      tipo: 'PAGO_ELIMINADO',
      clienteNombre: 'Test',
      cobradorNombre: 'Test',
      eliminadoPorNombre: 'Test',
      montoPago: 100,
      fechaOriginalPago: new Date().toISOString(),
      creditoId: 'test'
    })
  };

  const { data: d1, error: e1 } = await supabase.from('collection_logs').upsert([logToInsert]);
  if (e1) {
    console.error("FAIL INSERT PAGO_ELIMINADO:", e1);
  } else {
    console.log("SUCCESS INSERT PAGO_ELIMINADO");
  }

  console.log("Testing delete payment log...");
  const { data: d2, error: e2 } = await supabase.from('collection_logs').delete().eq('id', 'fake-id-does-not-exist');
  if (e2) {
    console.error("FAIL DELETE collection_logs:", e2);
  } else {
    console.log("SUCCESS DELETE collection_logs (or 0 rows)");
  }
}

test();
