const https = require('https');
const fs = require('fs');

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
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', (e) => resolve({error: e.message}));
    req.end();
  });
}

(async () => {
  const clients = await get('clients?select=id,name,branch_id,is_active,deleted_at');
  const count = Array.isArray(clients) ? clients.length : 0;
  const deleted = Array.isArray(clients) ? clients.filter(c => c.deleted_at).length : 0;
  const inactive = Array.isArray(clients) ? clients.filter(c => c.is_active === false).length : 0;
  
  const report = {
    total_in_db: count,
    deleted_in_db: deleted,
    inactive_in_db: inactive,
    sample: Array.isArray(clients) ? clients.slice(0, 5) : clients
  };
  
  fs.writeFileSync('report_debug.json', JSON.stringify(report, null, 2));
  console.log('Report saved');
})();
