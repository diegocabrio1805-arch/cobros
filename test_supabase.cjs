require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('collection_logs').select('id, recorded_by, created_at, is_watched').order('created_at', { ascending: false }).limit(20);
  console.log(data);
}
check();
