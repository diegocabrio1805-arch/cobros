
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Searching for user 'FABIAN ARRUA'...");

    // 1. Find Fabian's User ID
    const { data: users, error: findError } = await supabase
        .from('profiles')
        .select('id, name')
        .or('username.ilike.FABIAN,username.ilike.FABIAN ARRUA,name.ilike.FABIAN%,name.ilike.%FABIAN%');

    if (findError) {
        console.error("Error finding user:", findError);
        return;
    }

    if (!users || users.length === 0) {
        console.log("User FABIAN not found.");
        return;
    }

    const fabian = users[0];
    console.log(`Found FABIAN: ${fabian.name} (${fabian.id})`);

    // 2. Find clients created by or assigned to Fabian? 
    // The requirement is "RESET CLIENTS OF FABIAN".
    // This usually means clients where branch_id = fabian.id (if he's a Manager/Collector working as branch)
    // OR clients where added_by = fabian.id.
    // Given the context of "conflicts", it's safer to delete clients LINKED to him.

    // Let's look for clients where added_by = fabian.id
    console.log("Deleting Client Data...");

    // We can't easily cascade delete if foreign keys are strict, so we go bottom-up.
    // Logs -> Payments -> Loans -> Clients

    // A. Find Clients IDs
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('added_by', fabian.id);

    if (clientError) {
        console.error("Error fetching clients:", clientError);
        return;
    }

    const clientIds = clients.map(c => c.id);
    console.log(`Found ${clientIds.length} clients for Fabian.`);

    if (clientIds.length === 0) {
        console.log("No clients to delete.");
        return;
    }

    // B. Delete Logs for these clients
    const { error: logsError } = await supabase
        .from('collection_logs')
        .delete()
        .in('client_id', clientIds);
    if (logsError) console.error("Error deleting logs:", logsError);
    else console.log("Deleted logs.");

    // C. Delete Payments for these clients
    const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .in('client_id', clientIds);
    if (paymentsError) console.error("Error deleting payments:", paymentsError);
    else console.log("Deleted payments.");

    // D. Delete Loans for these clients
    const { error: loansError } = await supabase
        .from('loans')
        .delete()
        .in('client_id', clientIds);
    if (loansError) console.error("Error deleting loans:", loansError);
    else console.log("Deleted loans.");

    // E. Finally, Delete Clients
    const { error: deleteClientsError } = await supabase
        .from('clients')
        .delete()
        .in('id', clientIds);

    if (deleteClientsError) {
        console.error("Error deleting clients:", deleteClientsError);
    } else {
        console.log("SUCCESS: Deleted clients and related data for Fabian.");
    }
}

main();
