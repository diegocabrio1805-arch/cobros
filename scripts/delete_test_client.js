
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    // Find the client
    const { data: clients, error: fetchError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('name', 'TEST CLIENT - SYNC CHECK')
        .limit(1);

    if (fetchError) {
        console.error('Error fetching client:', fetchError);
        return;
    }

    if (!clients || clients.length === 0) {
        console.log('Client not found (maybe already deleted?)');
        return;
    }

    const client = clients[0];
    console.log('Found client to delete:', client);

    // Soft Delete (is_active = false)
    const { data, error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', client.id)
        .select();

    if (error) {
        console.error('Error deleting client:', error);
    } else {
        console.log('Client soft-deleted (marked inactive):', data);
    }
}

main();
