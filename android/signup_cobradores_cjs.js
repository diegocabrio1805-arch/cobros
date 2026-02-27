
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createCobradores() {
    const users = [
        { email: 'diegovillalba@anexocobro.com', password: '123456' },
        { email: 'zona2@anexocobro.com', password: '123456' }
    ];

    for (const user of users) {
        console.log(`Creando usuario: ${user.email}...`);
        // Usar signUp de Auth API
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
