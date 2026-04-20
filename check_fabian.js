const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

let envPath = '.env';
if (!fs.existsSync(envPath)) envPath = '.env.local';
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://samgpnczlznynnfhjjff.supabase.co'; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error: userError } = await supabase.from('profiles').select('id, name').ilike('name', '%fabian%');
  const fabianIds = users?.map(u => u.id) || ['a69e2207-db0a-49b7-a764-2787624e5777'];

  const { data: logs, error: logsError } = await supabase
    .from('collection_logs')
    .select('id, type, amount, date, client_id, collector_id, notes')
    .in('collector_id', fabianIds)
    .order('date', { ascending: false })
    .limit(50);
    
  fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros\\fabian_output.json', JSON.stringify({users, userError, logs, logsError}, null, 2));
}
check();
