import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log("Querying profiles...");
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, username, name, role, managed_by');
    if (pError) {
        console.error("Profiles error:", pError);
        return;
    }
    console.log("Profiles count:", profiles.length);
    profiles.forEach(p => {
        console.log(`- ID: ${p.id} | Name: ${p.name} | Role: ${p.role} | Username: ${p.username} | ManagedBy: ${p.managed_by}`);
    });

    console.log("\nQuerying simulated orders...");
    const { data: orders, error: oError } = await supabase.from('simulated_orders').select('*');
    if (oError) {
        console.error("Orders error:", oError);
        return;
    }
    console.log("Orders count:", orders.length);
    orders.forEach(o => {
        console.log(`- Order ID: ${o.id} | Client: ${o.client_name} | Collector: ${o.collector_id} | Branch: ${o.branch_id}`);
    });
}

check();
