import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("=== BUSCANDO TODOS LOS NO_PAGO ===");

    const { data: logs, error: logsError } = await supabase
        .from('collection_logs')
        .select('*')
        .eq('type', 'NO_PAGO')
        .order('date', { ascending: false })
        .limit(20);

    if (logsError) {
        console.error("Error al buscar logs:", logsError.message);
        return;
    }

    console.log(`Se encontraron ${logs?.length} logs de NO_PAGO.`);
    
    if (logs && logs.length > 0) {
        logs.forEach(l => {
            console.log(`- ID: ${l.id} | Loan: ${l.loan_id} | Date: ${l.date} | Collector: ${l.collector_id || l.collectorId}`);
        });
    } else {
        console.log("No se encontró NINGÚN registro de NO_PAGO en la base de datos.");
    }
}

run();
