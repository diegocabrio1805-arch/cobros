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
    const d = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "COBRADOR ALTERFIN 01",
        username: "alterfincobrador01",
        password: "04032026",
        role: "Cobrador",
        managed_by: "882a2609-6ead-454b-931c-7f15c4060fc5",
        managedBy: "882a2609-6ead-454b-931c-7f15c4060fc5", // camelCase property
        requiresLocation: false // camelCase property
    };

    const { data, error } = await supabase.from('profiles').upsert([d]);
    console.log('Upsert test result error:', error);
}

check();
