import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
  const newAuditLog = {
    id: 'f9b5c328-abcd-4f32-8493-2940291abcde',
    loan_id: 'dummy-loan',
    client_id: 'dummy-client',
    branch_id: 'dummy-branch',
    type: 'PAGO_ELIMINADO',
    amount: 100,
    date: new Date().toISOString(),
    location: '{}',
    notes: '[ORIGIN:2026-03-18]',
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('collection_logs').insert([newAuditLog]).select();
  if (error) {
    fs.writeFileSync('insert_result.txt', "SQL_ERROR: " + JSON.stringify(error));
  } else {
    fs.writeFileSync('insert_result.txt', "SQL_SUCCESS: " + JSON.stringify(data));
    await supabase.from('collection_logs').delete().eq('id', 'f9b5c328-abcd-4f32-8493-2940291abcde');
  }
}

testInsert();
