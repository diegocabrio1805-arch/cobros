
const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'samgpnczlznynnfhjjff';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE2NTU2NCwiZXhwIjoyMDg3NzQxNTY0fQ.rty4lO9LNcGmnYXtLu_iWw_berrWQQI';

async function runSQL(sql) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sql });
        const opts = {
            hostname: `${PROJECT_ID}.supabase.co`,
            port: 443,
            path: '/rest/v1/rpc',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        // Use pg endpoint
        const opts2 = {
            hostname: `db.${PROJECT_ID}.supabase.co`,
            port: 5432
        };

        // Just use the REST API approach
        const req = https.request({
            hostname: `${PROJECT_ID}.supabase.co`,
            port: 443,
            path: '/rest/v1/',
            method: 'GET',
            headers: { 'apikey': SERVICE_KEY }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 200) }));
        });
        req.on('error', reject);
        req.end();
    });
}

// Test DNS first
const dns = require('dns');
dns.resolve4(`${PROJECT_ID}.supabase.co`, (err, addresses) => {
    if (err) {
        console.log('DNS FAIL:', err.code);
        console.log('Need to use manual SQL injection via Supabase dashboard');
    } else {
        console.log('DNS OK! IP:', addresses[0]);
        runSQL('SELECT 1').then(r => console.log('API test:', r)).catch(e => console.log('API error:', e.message));
    }
});
