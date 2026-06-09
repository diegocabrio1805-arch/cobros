const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Logging in...');
  const username = 'ddante1983';
  const email = username + '@anexocobro.com';
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: 'Cobros2026'
  });
  
  if (authError) {
    console.error('Login error:', authError.message);
    return;
  }
  console.log('Logged in as:', authData.user.id);

  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.log('Profiles error:', error.message);
  } else {
    console.log('Profiles count:', data.length);
    console.log('Managers:', data.filter(u => u.role === 'Gerente' || u.role === 'MANAGER'));
  }
}

check();
