import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testFetch() {
    console.log("Testing connection...");

    const { data: clients, error: clientsErr } = await supabase.from('clients').select('id, name').limit(5);
    console.log("CLIENTS:", clients?.length, clientsErr ? clientsErr : '');
    console.log("CLIENT DATA SAMPLE:", clients);

    const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    console.log("RECENT PAYMENTS:", payments, payErr ? payErr : '');

    const { data: users, error: usersErr } = await supabase.from('users').select('id, name, role').limit(5);
    console.log("USERS:", users?.length, usersErr ? usersErr : '');

    const { data: logs, error: logsErr } = await supabase.from('collection_logs').select('id').limit(5);
    console.log("LOGS:", logs?.length, logsErr ? logsErr : '');

    // Check if RLS is enabled
    const { data: rlsData, error: rlsErr } = await supabase.rpc('get_rls_status');
    console.log("RLS Status (RPC):", rlsData, rlsErr ? rlsErr.message : '');

    // Log currently authenticated user (should be null for Node)
    const { data: authData } = await supabase.auth.getUser();
    console.log("Auth User:", authData.user ? authData.user.id : 'null');
}

testFetch();
