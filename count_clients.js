const https = require('https');
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

function getCount(table) {
    return new Promise((resolve) => {
        const url = `https://samgpnczlznynnfhjjff.supabase.co/rest/v1/${table}?select=id&limit=1`;
        https.get(url, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}`, 'Prefer': 'count=exact' } }, (res) => {
            resolve(`${table}: ${res.headers['content-range']}`);
        }).on('error', () => resolve(`${table}: error`));
    });
}

Promise.all([getCount('clients'), getCount('loans')]).then(console.log);
