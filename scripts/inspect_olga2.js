import fetch from 'node-fetch';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const baseUrl = 'https://samgpnczlznynnfhjjff.supabase.co/rest/v1';

async function test() {
  const headers = { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` };

  console.log('Fetching OLGA NOEMI GAVILAN...');
  const res = await fetch(`${baseUrl}/clients?name=ilike.*OLGA%20NOEMI%20GAVILAN*&select=*`, { headers });
  const clients = await res.json();
  const client = clients[0];
  const clientId = client.id;
  
  const resLogs = await fetch(`${baseUrl}/collection_logs?client_id=eq.${clientId}&order=timestamp.asc`, { headers });
  const logs = await resLogs.json();
  console.log(`Found ${logs.length} logs`);
  logs.forEach(log => {
     console.log(`${log.timestamp} | Type: ${log.type} | Amount: ${log.amount} | is_opening: ${log.is_opening}`);
  });
}
test();
