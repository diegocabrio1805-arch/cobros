import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  try {
    const { data, error } = await supabase.from('collection_logs').insert([{
      loan_id: 'test-loan',
      client_id: 'test-client',
      type: 'PAGO_ELIMINADO',
      amount: 1,
      date: new Date().toISOString(),
      location: { lat: 0, lng: 0 }
    }]);
    
    fs.writeFileSync('output.txt', JSON.stringify({ data, error }, null, 2));
  } catch (e) {
    fs.writeFileSync('output.txt', e.toString());
  }
}
run();
