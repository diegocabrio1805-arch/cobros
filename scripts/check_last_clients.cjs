
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, '');
            env[key] = value;
        }
    });
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastClients() {
    const { data, error } = await supabase
        .from('clients')
        .select('id, name, created_at, updated_at, added_by')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }
    console.table(data);

    // Fetch user name for the creator
    if (data[0]) {
        const creatorId = data[0].added_by;
        const { data: userData } = await supabase.from('profiles').select('name').eq('id', creatorId).single();
        if (userData) console.log("Creator Name:", userData.name);
    }
}

checkLastClients();
