import fetch from 'node-fetch';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

async function test() {
  const res = await fetch('https://samgpnczlznynnfhjjff.supabase.co/rest/v1/collection_logs?type=eq.PAGO_ELIMINADO', {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
  });
  const data = await res.json();
  console.log(`FOUND ${data.length} PAGO_ELIMINADO LOGS`);
  if (data.length > 0) {
    console.log(data[data.length - 1]);
  }
}
test();
