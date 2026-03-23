import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const names = ['QUIÑONEZ GARCIA', 'FARIÑA VERA'];
    
    for (const n of names) {
        console.log(`\n============================`);
        console.log(`Buscando: ${n}`);
        const { data: clients } = await supabase.from('clients').select(`id, name, document_id, added_by, branch_id, deleted_at, is_hidden, created_at`).ilike('name', `%${n}%`);
        for (const c of clients || []) {
            console.log(`\nCliente: ${c.name} | Doc: ${c.document_id} | ID: ${c.id}`);
            console.log(`  -> added_by: ${c.added_by} | branch_id: ${c.branch_id} | deleted: ${c.deleted_at} | hidden: ${c.is_hidden} | created: ${c.created_at}`);
            const { data: loans } = await supabase.from('loans').select(`id, status, total_amount, balance, principal, created_at, deleted_at, updated_at`).eq('client_id', c.id);
            loans.forEach(l => {
                console.log(`  - Loan ID: ${l.id}`);
                console.log(`    Status: ${l.status}, TotalAmt: ${l.total_amount}, Balance: ${l.balance}, Principal: ${l.principal}`);
                console.log(`    Deleted: ${l.deleted_at} | Updated: ${l.updated_at}`);
            });
        }
    }
}
run();
