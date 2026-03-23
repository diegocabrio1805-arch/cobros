import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const names = ['CHAPARRO', 'BAEZ JIMENEZ', 'CAÑETE PERALTA', 'GENES PINTOS'];
    
    for (const name of names) {
        console.log(`\n============== Buscando: ${name} ==============`);
        const { data: clients, error: errC } = await supabase.from('clients').select('*').ilike('name', `%${name}%`);
        if (errC) {
            console.error(errC);
            continue;
        }
        
        for (const client of clients || []) {
            console.log(`\nCliente: ID=${client.id} | Name=${client.name} | DocId=${client.document_id}`);
            
            const { data: loans, error: errL } = await supabase.from('loans').select('*').eq('client_id', client.id);
            if (errL) {
                console.error(errL);
                continue;
            }
            
            console.log(`Préstamos encontrados: ${loans.length}`);
            loans.forEach(l => {
                console.log(` - Loan ID: ${l.id} | Status: ${l.status} | TotalAmt: ${l.total_amount} | Balance: ${l.balance} | Principal: ${l.principal} | UpdatedAt: ${l.updated_at}`);
            });
        }
    }
}

run();
