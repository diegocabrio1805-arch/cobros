import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://samgpnczlznynnfhjjff.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE');

async function check() {
    const payload = {
        id: 'not-a-uuid', 
        name: 'test', 
        username: 'test', 
        password: '123',
        role: 'MANAGER', 
        blocked: false, 
        updated_at: new Date().toISOString()
    };
    
    console.log("Intentando upsert con string que no es uuid...");
    const { data, error } = await supabase.from('profiles').upsert(payload);
    console.log('Error:', error);
}
check();
