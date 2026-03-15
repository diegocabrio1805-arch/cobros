const https = require('https');

const data = JSON.stringify({
    id: "test-" + Date.now(),
    loan_id: "00000000-0000-0000-0000-000000000000",
    client_id: "00000000-0000-0000-0000-000000000000",
    collector_id: "00000000-0000-0000-0000-000000000000",
    branch_id: "00000000-0000-0000-0000-000000000000",
    amount: 10,
    date: new Date().toISOString(),
    installment_number: 1,
    location: null,
    is_virtual: false,
    is_renewal: false,
    deleted_at: null,
    updated_at: new Date().toISOString()
});

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const options = {
    hostname: 'samgpnczlznynnfhjjff.supabase.co',
    port: 443,
    path: '/rest/v1/payments',
    method: 'POST',
    headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Prefer': 'return=representation'
    }
};

const req = https.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log("STATUS:", res.statusCode);
        console.log("BODY:", body);
        process.exit(0);
    });
});

req.on('error', error => {
    console.error(error);
    process.exit(1);
});

req.write(data);
req.end();
