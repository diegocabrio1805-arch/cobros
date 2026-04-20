const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const lines = envLocal.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'alterfin@anexocobro.com', // Corrected email
        password: '20252026'
    });

    if (authError) {
        console.error("Manager Login Failed:", authError);
        return;
    }

    console.log("Manager logged in");

    const d = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "ALTERFINZONA01",
        username: "654321", // New username
        password: "654321", // New password
        role: "Cobrador",
        managed_by: authData.user.id,
        expiry_date: "2026-03-15",
        requires_location: false
    };

    const { data, error } = await supabase.from('profiles').upsert([d]);
    console.log('Upsert test result error:', error);
    console.log('Upsert data:', data);

    const { data: q } = await supabase.from('profiles').select('username, password, name').eq('id', d.id);
    console.log('Profile now is:', q);

    const payload = { userId: "550e8400-e29b-41d4-a716-446655440000", newUsername: "654321", newPassword: "654321" };

    const { data: eData, error: eErr } = await supabase.functions.invoke('update-auth-user', {
        body: payload
    });
    console.log('Edge func result:', eData, 'Error:', eErr);
}

check();
