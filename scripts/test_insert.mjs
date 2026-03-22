import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

let envPath = '.env';
if (!fs.existsSync(envPath)) envPath = '.env.local';
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://samgpnczlznynnfhjjff.supabase.co'; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Attempting to insert dummy PAGO_ELIMINADO log...");
  const dummyLog = {
    id: "00000000-0000-0000-0000-000000000abc",
    type: "PAGO_ELIMINADO",
    amount: 10,
    date: new Date().toISOString(),
    branch_id: "none",
    recorded_by: "system_test"
  };

  const { data, error } = await supabase.from('collection_logs').insert([dummyLog]);
  if (error) {
    console.error("INSERT FAILED!", JSON.stringify(error, null, 2));
  } else {
    console.log("INSERT SUCCESS!", data);
    // Cleanup
    await supabase.from('collection_logs').delete().eq('id', dummyLog.id);
  }
}
testInsert();
