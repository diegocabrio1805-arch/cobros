require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
    const swagger = await res.json();
    console.log("CLIENTS SCHEMA:");
    console.dir(swagger.definitions.clients.properties.id, { depth: null });
    console.log("LOANS SCHEMA:");
    console.dir(swagger.definitions.loans.properties.id, { depth: null });
}
run();
