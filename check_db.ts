import { supabase } from './utils/supabaseClient';

async function main() {
    const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (loansError) console.error('Error fetching loans:', loansError);
    else {
        loans.forEach(l => {
            console.log(`Loan ${l.id} - Total: ${l.total_amount}, Principal: ${l.principal}, Balance: ${l.balance}, Installments: ${l.installments?.length}`);
        });
    }

    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
        
    if (clientsError) console.error('Error fetching clients:', clientsError);
    else {
        clients.forEach(c => {
            console.log(`Client ${c.id} - Name: ${c.name}, Capital: ${c.capital}, CurrentBalance: ${c.current_balance}`);
        });
    }
}
main();
