const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const lines = envLocal.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
    if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: pData, error: pError } = await supabase.from('profiles').select('*').ilike('name', '%ALTERFINZONA01%');
    console.log('Profiles for ALTERFINZONA01:', pData);

    if (pData && pData.length > 0) {
        // Check auth.users too via admin api
        const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
        if (users && users.users) {
            const match = users.users.find(u => u.id === pData[0].id);
            console.log('Auth user match:', match ? `Found - email: ${match.email}, created: ${match.created_at}` : 'NOT FOUND IN AUTH.USERS');
        }
    }
}

check();
