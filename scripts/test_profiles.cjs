require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('profiles').select('*').limit(10);
    console.log('PROFILES ERROR:', error);
    console.log('PROFILES DATA:', data);
}
run();
