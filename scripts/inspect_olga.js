import fetch from 'node-fetch';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const baseUrl = 'https://samgpnczlznynnfhjjff.supabase.co/rest/v1';

async function test() {
  const headers = { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` };

  console.log('Fetching OLGA NOEMI GAVILAN...');
  const url = `${baseUrl}/clients?name=ilike.*OLGA%20NOEMI%20GAVILAN*&select=*`;
  const res = await fetch(url, { headers });
  const clients = await res.json();
  
  if (!clients || clients.length === 0) {
    console.log('Not found by exact name, trying ILIKE %OLGA%');
    const res2 = await fetch(`${baseUrl}/clients?name=ilike.*OLGA*&select=*`, { headers });
    const clients2 = await res2.json();
    console.log(clients2);
    return;
  }
  
  const client = clients[0];
  console.log('--- CLIENT DATA ---');
  console.log(JSON.stringify(client, null, 2));

  const clientId = client.id;
  console.log('\n--- COLLECTION LOGS ---');
  const resLogs = await fetch(`${baseUrl}/collection_logs?client_id=eq.${clientId}&order=timestamp.desc`, { headers });
  const logs = await resLogs.json();
  console.log(`Found ${logs.length} logs`);
  logs.forEach(log => {
     console.log(`${log.timestamp} | ${log.type} | ${log.amount} | ${log.details}`);
  });

}
test();
