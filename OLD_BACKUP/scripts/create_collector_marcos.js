
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: users, error: uErr } = await supabase.from('profiles').select('id, name').limit(1);
    if (uErr) {
        console.error('Error fetching admin/user:', uErr);
        return;
    }
    const admin = users[0];

    const newUser = {
        id: crypto.randomUUID(),
        name: 'Marcos',
        username: 'marcos_collector',
        password: 'password123',
        role: 'Cobrador',
        blocked: false,
        managed_by: admin.id
    };

    const { data, error } = await supabase.from('profiles').insert(newUser).select();

    if (error) {
        console.error('Error creating Marcos:', error);
    } else {
        console.log('Collector Marcos created:', data);
    }
}

main();
