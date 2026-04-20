const https = require('https');

const SUPABASE_URL = 'samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

function query(tableName, filter) {
  return new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/${tableName}?${filter}`,
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({error: 'Parse error', raw: data});
        }
      });
    });
    req.on('error', (e) => resolve({error: e.message}));
    req.end();
  });
}

(async () => {
  console.log('--- BUSCANDO EN SUPABASE ---');
  
  const client = await query('clients', 'id=eq.3937299');
  console.log('Cliente (3937299):', JSON.stringify(client, null, 2));

  const loan = await query('loans', 'client_id=eq.3937299');
  console.log('Préstamo (Isabel):', JSON.stringify(loan, null, 2));

  const allClientsCount = await query('clients', 'select=count&limit=1');
  console.log('Conteo total clientes:', JSON.stringify(allClientsCount, null, 2));
})();
