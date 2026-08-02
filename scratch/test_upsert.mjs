import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const payload = {
        id: '12345678-1234-1234-1234-123456789012', 
        name: 'test', 
        username: 'test', 
        password: '123',
        role: 'MANAGER', 
        blocked: false, 
        expiry_date: null,
        managed_by: null, 
        profile_pic: null,
        home_pic: null, 
        home_location: null,
        requires_location: null, 
        deleted_at: null,
        pay_config: null,
        updated_at: new Date().toISOString()
    };
    
    console.log("Intentando upsert...");
    const { data, error } = await supabase.from('profiles').upsert(payload);
    console.log('Error:', error);
}
check();
