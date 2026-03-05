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
        email: 'alterfin@anexocobros.app',
        password: '20252026'
    });

    if (authError) {
        console.error("Manager Login Failed:", authError);
        return;
    }

    console.log("Manager logged in");

    const payload = { userId: "550e8400-e29b-41d4-a716-446655440000", newUsername: "123456", newPassword: "123456" };

    const { data, error: fnError } = await supabase.functions.invoke('update-auth-user', {
        body: payload
    });
    console.log('Edge function response data:', data, 'error:', fnError);
}

check();
