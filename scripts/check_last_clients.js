
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables. Make sure .env exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastClients() {
    console.log("Fetching last 5 clients...");
    const { data, error } = await supabase
        .from('clients')
        .select('id, name, created_at, added_by, branch_id, is_active, is_hidden')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching clients:", error);
        return;
    }

    console.log("Last 5 Clients in DB:");
    console.table(data);

    // Check for any clients with missing branch_id or odd added_by
    const problematic = data.filter(c => !c.branch_id || c.branch_id === 'none' || c.branch_id === 'admin-1');
    if (problematic.length > 0) {
        console.warn("⚠️ Found potentially problematic clients:", problematic);
    } else {
        console.log("✅ Recent clients look okay structurally (checked branch_id).");
    }
}

checkLastClients();
