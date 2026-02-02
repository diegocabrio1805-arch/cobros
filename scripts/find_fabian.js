
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', '%fabian%'); // Case insensitive search

    if (error) {
        console.error('Error searching fabian:', error);
    } else {
        console.log('Found users matching fabian:', users);
    }
}

main();
