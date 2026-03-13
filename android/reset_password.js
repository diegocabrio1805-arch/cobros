
const https = require('https');

const PROJECT_URL = 'samgpnczlznynnfhjjff.supabase.co';

// First test DNS
const dns = require('dns');
dns.resolve4(PROJECT_URL, (err, addresses) => {
    if (err) {
        console.log('DNS FAIL:', err.code, '- URL no resuelve aun');
        testLoginViaAdminOnly();
    } else {
        console.log('DNS OK! IP:', addresses[0]);
        testLoginViaAdminOnly();
    }
});

function testLoginViaAdminOnly() {
    // Try to login with signInWithPassword to test
    const data = JSON.stringify({
        email: 'ddante1983@anexocobro.com',
        password: 'Cobros2026'
    });

    const options = {
        hostname: PROJECT_URL,
        port: 443,
        path: '/auth/v1/token?grant_type=password',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            console.log('Auth API Status:', res.statusCode);
            const json = JSON.parse(body);
            if (res.statusCode === 200) {
                console.log('LOGIN EXITOSO! user:', json.user?.email);
            } else {
                console.log('LOGIN FAIL:', json.error_description || json.message || json.msg);
            }
        });
    });

    req.on('error', (e) => {
        console.log('CONNECTION ERROR:', e.code, e.message);
    });

    req.write(data);
    req.end();
}
