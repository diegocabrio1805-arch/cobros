import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://samgpnczlznynnfhjjff.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE');

async function run() {
  console.log("Signing in as DDANTE1983...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ddante1983@anexo.com',
    password: 'Cobros2026'
  });
  
  if(authError) {
    console.log("Failed to sign in with email, trying plain username just in case", authError.message);
    const { data: auth2, error: authErr2 } = await supabase.auth.signInWithPassword({
        email: 'DDANTE1983@anexo.com',
        password: 'Cobros2026'
    });
    if(authErr2) return console.log("Login failed", authErr2.message);
  }

  console.log("Logged in!");
  
  // Find DY_ACER
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('name', '%DY_ACER%').limit(1);
  if(!profiles || profiles.length === 0) {
      console.log("DY_ACER not found");
      return;
  }
  const dy_acer = profiles[0];
  console.log("Found DY_ACER:", dy_acer.id);

  const payload = {
      id: dy_acer.id, 
      name: dy_acer.name, 
      username: dy_acer.username, 
      password: dy_acer.password,
      role: dy_acer.role, 
      blocked: dy_acer.blocked, 
      expiry_date: dy_acer.expiry_date,
      managed_by: dy_acer.managed_by, 
      profile_pic: dy_acer.profile_pic,
      home_pic: dy_acer.home_pic, 
      home_location: dy_acer.home_location,
      requires_location: dy_acer.requires_location, 
      deleted_at: new Date().toISOString(),
      pay_config: dy_acer.pay_config,
      updated_at: new Date().toISOString()
  };

  console.log("Attempting upsert with deleted_at...");
  const { data: upsertData, error: upsertError } = await supabase.from('profiles').upsert(payload);
  console.log("Error:", upsertError);
}
run();
