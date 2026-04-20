const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

function insertTestLog() {
    const postData = JSON.stringify({
        id: '2cf10bc0-8806-444a-9e12-0fe0e2c8a2b5',
        loan_id: 'a7ba3145-c496-41f2-8c9e-ba7fa68b1a37', // Dummy UUIDs
        client_id: 'b6c10bc0-1111-444a-9e12-0fe0e2c8a2b5',
        branch_id: 'DDANTE1983', // Example
        recorded_by: 'DDANTE1983',
        collector_id: 'DDANTE1983',
        amount: 5000,
        type: 'PAGO_ELIMINADO',
        date: new Date().toISOString(),
        location: { lat: 0, lng: 0 },
        notes: "TEST"
    });

    const options = {
        hostname: 'samgpnczlznynnfhjjff.supabase.co',
        path: '/rest/v1/collection_logs',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Prefer': 'return=representation'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`RESPONSE: ${data}`);
        });
    });

    req.on('error', (e) => {
        console.error(`PROBLEM: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

insertTestLog();
