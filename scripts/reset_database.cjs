
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function wipeDatabase() {
    console.log("--- WIPING DATABASE (Clients & Collectors) ---");

    // 1. Delete Payments (Dependent on Loans)
    console.log("1. Deleting all payments...");
    const { error: err1 } = await supabase.from('payments').delete().neq('id', 'placeholder');
    if (err1) console.error("Error deleting payments:", err1);

    // 2. Delete Collection Logs
    console.log("2. Deleting all collection logs...");
    const { error: err2 } = await supabase.from('collection_logs').delete().neq('id', 'placeholder');
    if (err2) console.error("Error deleting logs:", err2);

    // 3. Delete Loans
    console.log("3. Deleting all loans...");
    const { error: err3 } = await supabase.from('loans').delete().neq('id', 'placeholder');
    if (err3) console.error("Error deleting loans:", err3);

    // 4. Delete Clients
    console.log("4. Deleting all clients...");
    const { error: err4 } = await supabase.from('clients').delete().neq('id', 'placeholder');
    if (err4) console.error("Error deleting clients:", err4);

    // 5. Delete Collectors (Keep Admins/Managers)
    // We assume roles are stored in 'profiles' or equivalent table mapped to 'users'
    console.log("5. Deleting collectors from profiles...");
    // Assuming 'Role.COLLECTOR' translates to string 'Cobrador' or similar used in app.
    // Based on previous debug output, role is 'Cobrador'.
    const { error: err5 } = await supabase.from('profiles').delete().eq('role', 'Cobrador');
    if (err5) console.error("Error deleting collectors:", err5);

    console.log("--- WIPE COMPLETE ---");
}

wipeDatabase();
