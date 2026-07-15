import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("Logging in as fabian2 (zona3)...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'zona3@anexocobro.com',
        password: '1234'
    });
    
    if (authError) {
        console.error("Auth Error:", authError.message);
        return;
    }
    console.log("Auth Success! ID:", authData.user.id);
    
    console.log("Querying simulated_orders...");
    const { data: orders, error } = await supabase.from('simulated_orders').select('*');
    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log(`Query Success! Found ${orders.length} orders:`);
        orders.forEach(o => {
            console.log(`- ID: ${o.id} | Client: ${o.client_name} | Collector: ${o.collector_id} | Branch: ${o.branch_id}`);
        });
    }
}

run();
