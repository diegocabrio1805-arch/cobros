import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data: users, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("Error profiles:", error);
    } else {
        console.log("All profiles:");
        users.forEach(u => console.log(`- ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | Username: ${u.username}`));
    }
}

check();
