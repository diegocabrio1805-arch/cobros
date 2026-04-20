import fs from 'fs';

const env = {
  VITE_SUPABASE_URL: 'https://samgpnczlznynnfhjjff.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE'
};

async function run() {
  const url = env.VITE_SUPABASE_URL + '/rest/v1/collection_logs?limit=1';
  const res = await fetch(url, {
    headers: {
      'apikey': env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  console.log("Columns found in first row:");
  if (data.length > 0) {
      console.log(Object.keys(data[0]).join(', '));
  } else {
      console.log("No data returned");
  }
}
run();
