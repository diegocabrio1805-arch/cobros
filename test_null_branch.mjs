import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    const payload = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        client_id: '123e4567-e89b-12d3-a456-426614174001',
        client_name: 'Test',
        principal: 500,
        interest_rate: 20,
        installments: 24,
        total_amount: 600,
        installment_value: 25,
        frequency: 'DIARIA',
        simulation_date: new Date().toISOString(),
        table_data: [],
        collector_id: '123e4567-e89b-12d3-a456-426614174002',
        // branch_id is intentionally omitted
    };

    console.log("Attempting insert without branch_id:", payload);
    const { data, error } = await supabase.from('simulated_orders').insert(payload);
    
    if (error) {
        console.error("Supabase Error:", error);
    } else {
        console.log("Insert Success!", data);
    }
}

testInsert();
