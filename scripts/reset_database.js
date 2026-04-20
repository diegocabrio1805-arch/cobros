
import { createClient } from '@supabase/supabase-js';

// Credentials for 'oppcy...' (Correct DB)
const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("--- STARTING DATABASE RESET ---");
    console.log("Preserving ADMIN users...");

    // 1. Get Admins to preserve
    const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('role', 'Administrador');

    if (adminError) {
        console.error("Error fetching admins:", adminError);
        return;
    }

    const adminIds = admins.map(a => a.id);
    console.log(`Found ${adminIds.length} admins to preserve:`, admins.map(a => a.username).join(', '));

    // 2. Delete Dependent Tables First (Logs, Payments)
    console.log("Deleting Collection Logs...");
    const { error: logsError } = await supabase.from('collection_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (logsError) console.error("Error deleting logs:", logsError);

    console.log("Deleting Payments...");
    const { error: payError } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (payError) console.error("Error deleting payments:", payError);

    // 3. Delete Loans
    console.log("Deleting Loans...");
    const { error: loansError } = await supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (loansError) console.error("Error deleting loans:", loansError);

    // 4. Delete Clients
    console.log("Deleting Clients...");
    const { error: clientsError } = await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (clientsError) console.error("Error deleting clients:", clientsError);

    // 5. Delete Non-Admin Profiles
    console.log("Deleting Non-Admin Profiles (Collectors, Managers)...");
    if (adminIds.length > 0) {
        const { error: profilesError } = await supabase
            .from('profiles')
            .delete()
            .not('id', 'in', `(${adminIds.join(',')})`); // Syntax for 'not in' might vary in JS client, let's use neq for single or filter

        // Supabase JS doesn't support 'not in' easily in one line without raw filter string syntax sometimes.
        // Safer to delete where role != Administrador
        const { error: profilesError2 } = await supabase
            .from('profiles')
            .delete()
            .neq('role', 'Administrador');

        if (profilesError2) console.error("Error deleting profiles:", profilesError2);
    } else {
        console.warn("No admins found! Aborting profile deletion to prevent lockout.");
    }

    console.log("--- RESET COMPLETE ---");
}

main();
