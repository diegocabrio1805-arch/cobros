import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

let envPath = '.env';
if (!fs.existsSync(envPath)) envPath = '.env.local';
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://samgpnczlznynnfhjjff.supabase.co'; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("Missing SUPABASE KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching logs...");
  const { data, error } = await supabase
    .from('collection_logs')
    .select('id, type, amount, date')
    .eq('type', 'PAGO_ELIMINADO');

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log(`Found ${data.length} PAGO_ELIMINADO logs`);
    data.forEach(d => console.log(d));
  }
}
check();
