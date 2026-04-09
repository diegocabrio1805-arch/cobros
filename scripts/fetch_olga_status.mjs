import fetch from 'node-fetch';

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const baseUrl = 'https://samgpnczlznynnfhjjff.supabase.co/rest/v1';
const headers = { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` };

async function test() {
  const res = await fetch(`${baseUrl}/loans?client_id=eq.fad3d307-f290-4e88-b849-64f83d7ba6bd&select=id,status,updated_at`, { headers });
  console.log(await res.json());
}
test();
