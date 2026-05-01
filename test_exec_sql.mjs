import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("=== PROBANDO RPC PARA SQL ===");
    
    // Intentar con 'exec_sql'
    const { data: data1, error: error1 } = await supabase.rpc('exec_sql', { 
        sql_query: 'SELECT 1' 
    });

    if (error1) {
        console.error("Error con exec_sql:", error1.message);
    } else {
        console.log("¡Éxito con exec_sql! Resultado:", data1);
        return;
    }

    // Intentar con 'execute_sql'
    const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { 
        query: 'SELECT 1' 
    });

    if (error2) {
        console.error("Error con execute_sql:", error2.message);
    } else {
        console.log("¡Éxito con execute_sql! Resultado:", data2);
        return;
    }
}

run();
