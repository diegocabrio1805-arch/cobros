
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createCobradores() {
    const users = [
        { email: 'diegovillalba@anexocobro.com', password: '1234' },
        { email: 'zona2@anexocobro.com', password: '1234' }
    ];

    for (const user of users) {
        console.log(`Creando usuario: ${user.email}...`);
        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
        });

        if (error) {
            console.error(`Error creando ${user.email}:`, error.message);
        } else {
            console.log(`Usuario ${user.email} creado exitosamente. ID: ${data.user.id}`);
        }
    }
}

createCobradores();
