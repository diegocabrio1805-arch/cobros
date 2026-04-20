const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const url = `https://samgpnczlznynnfhjjff.supabase.co/rest/v1/collection_logs?type=eq.PAGO_ELIMINADO&select=id,type,amount,date,recorded_by,branch_id`;

https.get(url, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const logs = JSON.parse(data);
        console.log(`PAGO_ELIMINADO count: ${logs.length}`);
        logs.forEach(l => console.log(JSON.stringify(l)));
    });
}).on('error', (e) => {
    console.error(e);
});
