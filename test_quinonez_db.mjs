import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const names = ['QUIÑONEZ GARCIA', 'MARA YAZMINE'];
    
    for (const n of names) {
        console.log(`\nBuscando: ${n}`);
        const { data: clients } = await supabase.from('clients').select('*').ilike('name', `%${n}%`);
        for (const c of clients || []) {
            console.log(`Cliente: ${c.name} | Doc: ${c.document_id} | ID: ${c.id}`);
            const { data: loans } = await supabase.from('loans').select('*').eq('client_id', c.id);
            loans.forEach(l => console.log(`  - Loan ID: ${l.id} | Status: ${l.status}, TotalAmt: ${l.total_amount}, Balance: ${l.balance}, Principal: ${l.principal}`));
        }
    }
}
run();
