const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

function fetchTable(table) {
    return new Promise((resolve, reject) => {
        const url = `https://samgpnczlznynnfhjjff.supabase.co/rest/v1/${table}?limit=1`;
        https.get(url, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(`--- ${table} ---\n${data}`));
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log(await fetchTable('payments'));
        console.log(await fetchTable('loans'));
        console.log(await fetchTable('collection_logs'));
    } catch (e) {
        console.error(e);
    }
}
run();
