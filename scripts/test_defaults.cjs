require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
    const swagger = await res.json();
    console.log("COLLECTION LOGS DEFAULT VALUES:");
    const props = swagger.definitions.collection_logs.properties;
    for (const key in props) {
        if (props[key].default) {
            console.log(`- ${key}: ${props[key].default}`);
        }
    }
}
run();
