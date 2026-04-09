const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

async function querySupabase(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            path: `/rest/v1/${path}`,
            method: 'GET',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (e) => { reject(e); });
        req.end();
    });
}

(async () => {
    try {
        const clients = await querySupabase("clients?id=eq.3937299");
        const loans = await querySupabase("loans?client_id=eq.3937299");
        const byName = await querySupabase("clients?name=ilike.*ISABEL*OLMEDO*");
        
        fs.writeFileSync('sync_report.json', JSON.stringify({clients, loans, byName}, null, 2));
        console.log('Report generated');
    } catch (error) {
        fs.writeFileSync('sync_report.json', JSON.stringify({error: error.message}));
    }
})();
