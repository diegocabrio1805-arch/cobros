import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
let url = '', key = '';
envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({ email: 'alterfinprueba@anexocobro.com', password: '123' });
  if (error) { console.error('Login error', error); return; }
  console.log('Logged in as', data.user.id);
  
  const { data: pData, error: pError } = await supabase.from('payments').select('id').limit(10);
  console.log('Payments count:', pData ? pData.length : 0, pError || 'OK');
  
  const { data: lData, error: lError } = await supabase.from('collection_logs').select('id').limit(10);
  console.log('Logs count:', lData ? lData.length : 0, lError || 'OK');
}
test();
