const fs = require('fs');

const SUPABASE_URL = 'samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

async function run() {
  try {
    const opts = {
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    console.log("Fetching by ID...");
    const res1 = await fetch(`https://${SUPABASE_URL}/rest/v1/clients?id=eq.3937299`, opts);
    const clients1 = await res1.json();
    
    console.log("Fetching by Name...");
    const res2 = await fetch(`https://${SUPABASE_URL}/rest/v1/clients?name=ilike.*ISABEL*OLMEDO*`, opts);
    const clients2 = await res2.json();

    const data = { byId: clients1, byName: clients2 };
    fs.writeFileSync('sync_report2.json', JSON.stringify(data, null, 2));
    console.log('Success sync_report2.json');
  } catch (e) {
    console.error("Failed:", e);
    fs.writeFileSync('sync_report2.json', JSON.stringify({error: e.message}));
  }
}
run();
