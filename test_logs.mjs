import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.VITE_SUPABASE_URL) dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://samgpnczlznynnfhjjff.supabase.co'; // using known url from previous grep
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...'; // I will just use the env if loaded

const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

async function checkLogs() {
  const { data, error } = await supabase
    .from('collection_logs')
    .select('*')
    .eq('type', 'PAGO_ELIMINADO');
    
  if (error) console.error(error);
  else {
    console.log(`Found ${data.length} DELETED_PAYMENT logs in Supabase.`);
    data.forEach(log => console.log(log.id, log.date, log.recorded_by, log.notes));
  }
}

checkLogs();
