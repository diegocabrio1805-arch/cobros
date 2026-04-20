import https from 'https';

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const options = {
  hostname: 'samgpnczlznynnfhjjff.supabase.co',
  path: '/rest/v1/collection_logs?select=type,id,amount,date',
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': 'Bearer ' + anonKey
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', d => { data += d; });
  res.on('end', () => {
    try {
      const logs = JSON.parse(data);
      const deleted = logs.filter(l => l.type === 'PAGO_ELIMINADO');
      console.log('TOTAL LOGS IN DB:', logs.length);
      console.log('DELETED LOGS IN DB:', deleted.length);
      if (deleted.length > 0) {
        console.log('Sample:', deleted[deleted.length - 1]);
      }
    } catch(e) {
      console.log('PARSE ERROR', e, data.substring(0, 100));
    }
  });
});

req.on('error', error => {
  console.error('HTTP ERROR', error);
});

req.end();
