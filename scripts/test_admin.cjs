require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', 'b3716a78-fb4f-4918-8c0b-92004e3d63ec');
    console.log('ADMIN PROFILE ERROR:', error);
    console.log('ADMIN PROFILE DATA:', data);

    // Also fetch the payment the user just created, sorting by date descending
    const { data: payments, error: pError } = await supabase.from('payments').select('*').order('date', { ascending: false }).limit(3);
    console.log('RECENT PAYMENTS ERROR:', pError);
    console.log('RECENT PAYMENTS DATA:', payments);
}
run();
