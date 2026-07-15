import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("Logging in...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'zona3@anexocobro.com',
        password: '1234'
    });
    
    if (authError) {
        console.error("Auth Error:", authError.message);
        return;
    }
    
    console.log("Querying orders...");
    const { data: orders, error } = await supabase.from('simulated_orders').select('*');
    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log(`Success! Found ${orders.length} orders:`);
        orders.forEach(o => {
            console.log(`- ID: ${o.id} | Client: ${o.client_name} | Date: ${o.simulation_date} | Created: ${o.created_at}`);
        });
    }
}

run();
