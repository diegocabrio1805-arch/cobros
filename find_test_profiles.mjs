import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("=== BUSCANDO PERFILES DE PRUEBA ===");

    // 1. Buscar el gerente 'GPS'
    const { data: managers, error: mangError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', '%gps%');

    if (mangError) {
        console.error("Error al buscar gerente:", mangError.message);
    } else {
        console.log("Gerentes encontrados:", managers);
    }

    // 2. Buscar el cobrador 'COBRADORGPS'
    const { data: collectors, error: collError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', '%cobrador%');

    if (collError) {
        console.error("Error al buscar cobrador:", collError.message);
    } else {
        console.log("Cobradores encontrados:", collectors);
    }
}

run();
