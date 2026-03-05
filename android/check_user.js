import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Superbase keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').eq('username', '123456');
    console.log("Profiles:", profiles);
    if (pErr) console.error("Profile Error:", pErr);

    if (profiles && profiles.length > 0) {
        const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
        if (uErr) {
            console.error("Auth Users error:", uErr);
        } else {
            const u = users.users.find(x => x.email === profiles[0].id + '@anexocobros.app' || x.email === profiles[0].username + '@anexocobros.app');
            console.log("Matching Auth User:", u);
        }
    }
}

checkUser();
