
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: users } = await supabase.from('profiles').select('id, name').eq('username', 'marcos_collector').limit(1);

    if (!users || users.length === 0) {
        console.log('Marcos not found');
        return;
    }
    const marcos = users[0];
    console.log('Found Marcos:', marcos);

    // Soft Delete (blocked = true)
    // Re-purposing 'blocked' as 'deleted' visually in the app, or actually just blocking him.
    // The user said "Delete". 

    const { data, error } = await supabase
        .from('profiles')
        .update({ blocked: true })
        .eq('id', marcos.id)
        .select();

    if (error) {
        console.error('Error soft-deleting Marcos:', error);
    } else {
        console.log('Marcos soft-deleted (blocked):', data);
    }
}

main();
