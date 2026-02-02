
console.log('Script started');
import { createClient } from '@supabase/supabase-js';
console.log('Imports done');

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    // Get a user
    const { data: users, error: uErr } = await supabase.from('profiles').select('id, name').limit(1);
    if (uErr) {
        console.error('Error fetching users:', uErr);
        return;
    }
    if (!users || users.length === 0) {
        console.error('No users found. Cannot create client without added_by.');
        return;
    }

    const user = users[0];
    console.log('Using user:', user);

    const newClient = {
        id: crypto.randomUUID(),
        name: 'TEST CLIENT - SYNC CHECK',
        document_id: '99999999',
        phone: '5555555555',
        address: 'Calle Falsa 123',
        branch_id: user.id,
        added_by: user.id,
        is_active: true,
        location: { lat: 0, lng: 0 },
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('clients').insert(newClient).select();

    if (error) {
        console.error('Error creating client:', error);
    } else {
        console.log('Client created:', data);
    }
}

main();
