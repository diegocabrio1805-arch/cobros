import fetch from 'node-fetch';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const baseUrl = 'https://samgpnczlznynnfhjjff.supabase.co/rest/v1';

async function test() {
  const headers = { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` };

  const resLoans = await fetch(`${baseUrl}/loans?status=eq.Activo&select=id,client_id,created_at`, { headers });
  const activeLoans = await resLoans.json();
  
  if (!Array.isArray(activeLoans)) { console.log(activeLoans); return; }

  const clientMap = {};
  activeLoans.forEach(l => {
     if(!clientMap[l.client_id]) clientMap[l.client_id] = [];
     clientMap[l.client_id].push(l);
  });

  const duplicates = Object.keys(clientMap).filter(k => clientMap[k].length > 1);
  console.log(`Found ${duplicates.length} clients with multiple active loans`);
  
  let sql = 'ALTER TABLE loans DISABLE TRIGGER USER;\n';
  duplicates.forEach(clientId => {
     const loans = clientMap[clientId];
     loans.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
     // Keep the first (most recent) active. Close the others.
     for(let i=1; i < loans.length; i++){
          sql += `UPDATE loans SET status = 'Pagado' WHERE id = '${loans[i].id}';\n`;
     }
  });
  sql += 'ALTER TABLE loans ENABLE TRIGGER USER;';
  
  const fs = require('fs');
  fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\artifacts\\repair_multiple_loans.sql', sql);
  console.log("SQL File generated.");
}
test();
