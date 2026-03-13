require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: logs, error } = await supabase.from('collection_logs').select('*').order('date', { ascending: false }).limit(3);
    console.log('RECENT LOGS ERROR:', error);
    console.log('RECENT LOGS DATA:', logs);
}
run();
