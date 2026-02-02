
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Buscando cliente 'Ignacia Peña'...");

    // 1. Encuentra el cliente
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', '%Ignacia%')
        .or('name.ilike.%peña%,name.ilike.%pena%'); // Handle encoding/typos

    if (clientError) {
        console.error("Error buscando cliente:", clientError);
        return;
    }

    if (!clients || clients.length === 0) {
        console.log("No se encontró cliente 'Ignacia'.");
        return;
    }

    const targetClient = clients[0];
    console.log(`Cliente encontrado: ${targetClient.name} - ID: ${targetClient.id}`);

    // 2. Busca logs de este cliente, especialmente de 1.200.000
    console.log(`Buscando pagos de 1.200.000 para este cliente...`);

    const { data: logs, error: logError } = await supabase
        .from('collection_logs')
        .select('*') // Select all columns to check flags
        .eq('client_id', targetClient.id)
        .eq('amount', 1200000);

    if (logError) {
        console.error("Error buscando logs:", logError);
    } else {
        if (logs.length === 0) {
            console.log("No se encontraron pagos exactos de 1.200.000. Listando TODOS los pagos recientes del cliente:");
            const { data: allLogs } = await supabase
                .from('collection_logs')
                .select('*')
                .eq('client_id', targetClient.id)
                .order('date', { ascending: false })
                .limit(5);

            allLogs.forEach(l => {
                console.log(`- Monto: ${l.amount} | Fecha: ${l.date} | Creado: ${l.updated_at} | Tipo: ${l.type} | Renewal: ${l.is_renewal}`);
            });
        } else {
            console.log(`\n--- PAGOS DE 1.200.000 ENCONTRADOS (${logs.length}) ---`);
            logs.forEach(l => {
                console.log(`ID: ${l.id}`);
                console.log(`- Amount: ${l.amount}`);
                console.log(`- Date (Fecha Cobro): ${l.date}`);
                console.log(`- Updated_At (Fecha Subida): ${l.updated_at}`);
                console.log(`- Recorded By: ${l.recorded_by}`);
                console.log(`- Type: ${l.type}`);
                console.log(`- Is Renewal: ${l.is_renewal}`);
                console.log(`- Is Opening: ${l.is_opening}`);
            });
        }
    }
}

main();
