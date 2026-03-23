import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Buscando a Chaparro...");
    const { data: clients, error: errC } = await supabase.from('clients').select('*').ilike('name', '%CHAPARRO%');
    if (errC) return console.error(errC);
    
    if (!clients || clients.length === 0) {
        return console.log("Chaparro no existe en Supabase.");
    }
    
    const chaparro = clients[0];
    console.log("Cliente Chaparro:", chaparro);
    
    const { data: loans, error: errL } = await supabase.from('loans').select('*').eq('client_id', chaparro.id);
    if (errL) return console.error(errL);
    
    console.log("Loans de Chaparro (antes del upsert):", loans);
    
    // Generate the mapped payload exactly as useSync.ts does
    const activeLoan = loans.find(l => l.status === 'ACTIVE' || l.status === 'activo' || l.balance > 0);
    const loanId = activeLoan ? activeLoan.id : `L-${chaparro.id}`;
    
    const mappedLoan = {
        id: loanId,
        client_id: chaparro.id,
        collector_id: chaparro.added_by, // using whoever added her
        branch_id: chaparro.branch_id,
        principal: 573913,
        interest_rate: 15,
        total_installments: 44,
        installment_value: 11000,
        total_amount: 660000,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        installments: [{ id: 'inst-1', number: 1, amount: 11000, status: 'PAID', dueDate: new Date().toISOString() }], // mock short array
        frequency: 'DIARIO',
        is_renewal: false,
        custom_holidays: [],
        deleted_at: null,
        updated_at: new Date().toISOString(),
        total_paid: 154000,
        balance: 506000,
        raw_data: {}
    };
    
    console.log("Intentando UPSERT en la tabla loans...");
    
    const { data: result, error: upsertErr } = await supabase.from('loans').upsert([mappedLoan]);
    if (upsertErr) {
        console.error("UPSERT FALLÓ CON EL ERROR:", upsertErr);
    } else {
        console.log("UPSERT EXITOSO:", result);
        
        // Revert it immediately just in case
        console.log("Revirtiendo...");
        if (activeLoan) {
            await supabase.from('loans').upsert([activeLoan]);
        } else {
            await supabase.from('loans').delete().eq('id', loanId);
        }
    }
}

run();
