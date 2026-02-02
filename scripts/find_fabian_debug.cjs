
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

async function checkFabian() {
    console.log("Searching for 'Fabian'...");

    // 1. Find the user
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', '%fabian%');

    if (userError) { console.error(userError); return; }

    if (users.length === 0) {
        console.log("No user found with name like 'Fabian'");
        return;
    }

    console.log("Found User(s):");
    console.table(users);

    const fabian = users[0];
    console.log(`Checking recent data for ID: ${fabian.id} (Role: ${fabian.role})`);

    // 2. Check Clients added by him
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at, branch_id, is_active')
        .eq('added_by', fabian.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("Recent Clients by Fabian:");
    console.table(clients);

    // 3. Check Loans added by him or where he is collector
    const { data: loans } = await supabase
        .from('loans')
        .select('id, client_id, amount:principal, created_at, branch_id')
        .eq('collector_id', fabian.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("Recent Loans by Fabian (Collector):");
    console.table(loans);
}

checkFabian();
