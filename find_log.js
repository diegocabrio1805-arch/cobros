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
          resolve({error: 'Parse error', raw: data});
        }
      });
    });
    req.on('error', (e) => resolve({error: e.message}));
    req.end();
  });
}

(async () => {
  console.log('Buscando log con monto 2444207...');
  // Buscamos en collection_logs el monto exacto o aproximado
  const logs = await get('collection_logs?amount=eq.2444207&select=*');
  console.log('Logs encontrados:', JSON.stringify(logs, null, 2));

  if (Array.isArray(logs) && logs.length > 0) {
    const clientId = logs[0].client_id || logs[0].clientId;
    console.log('Buscando cliente con ID:', clientId);
    if (clientId) {
      const client = await get(`clients?id=eq.${clientId}&select=*`);
      console.log('Cliente encontrado:', JSON.stringify(client, null, 2));
    }
  } else {
    console.log('No se encontró el log exacto. Buscando logs recientes...');
    const recentLogs = await get('collection_logs?order=date.desc&limit=10&select=*');
    console.log('Logs recientes:', JSON.stringify(recentLogs, null, 2));
  }
})();
