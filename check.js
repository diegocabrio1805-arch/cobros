import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oppcyderpkhcnduqexag.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data: clients } = await supabase.from('clients').select('*').ilike('name', '%ALICIA%');
    console.log("Found clients:", clients?.map(c => c.name));

    if (clients && clients.length > 0) {
        const alicia = clients.find(c => c.name.includes("BEATRIZ")) || clients[0];
        const { data: loans } = await supabase.from('loans').select('*').eq('clientId', alicia.id);
        console.log("Loans for Alicia:", loans);

        const { data: logs } = await supabase.from('collection_logs').select('*').eq('clientId', alicia.id);
        console.log("Total logs:", logs?.length);
    }
}

check();
