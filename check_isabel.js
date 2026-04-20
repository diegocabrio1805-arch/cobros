const https = require('https');

const SUPABASE_URL = 'samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

function get(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/' + path,
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
          resolve(data);
        }
      });
    });
    req.on('error', (e) => resolve({error: e.message}));
    req.end();
  });
}

(async () => {
  console.log('--- BUSCANDO A ISABEL OLMEDO (ID: 3937299) ---');
  
  const clientById = await get('clients?id=eq.3937299');
  console.log('Cliente por ID (3937299):', JSON.stringify(clientById, null, 2));

  const clientByName = await get('clients?name=ilike.*ISABEL*OLMEDO*');
  console.log('Cliente por Nombre (ISABEL OLMEDO):', JSON.stringify(clientByName, null, 2));

  const loansByClientId = await get('loans?client_id=eq.3937299');
  console.log('Préstamos para el Cliente 3937299:', JSON.stringify(loansByClientId, null, 2));

  const allLoans = await get('loans?limit=5');
  console.log('Muestra de préstamos:', JSON.stringify(allLoans, null, 2));
})();
