const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

function req(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'samgpnczlznynnfhjjff.supabase.co',
            path: '/rest/v1/' + path,
            method: 'GET',
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
        };
        const r = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        r.on('error', reject);
        r.end();
    });
}

async function run() {
    try {
        console.log("Searching for JUVE VILLALBA...");
        let users = await req('profiles?select=id,name');
        let juve = users.find(u => u.name && u.name.toUpperCase().includes('JUVE VILLALBA'));
        console.log("Found Juve:", juve);

        console.log("Searching for IGNACIA RODRIGUEZ...");
        let clients = await req('clients?select=id,name');
        let ignacia = clients.find(c => c.name && c.name.toUpperCase().includes('IGNACIA RODRIGUEZ'));
        console.log("Found Ignacia:", ignacia);

        if (ignacia) {
            let loans = await req('loans?select=id,client_id,collector_id&client_id=eq.' + ignacia.id);
            console.log("Found Loans for Ignacia:", loans);
        }
        
        require('fs').writeFileSync('find_result.json', JSON.stringify({ juve, ignacia }, null, 2));

    } catch(e) {
        console.error(e);
        require('fs').writeFileSync('find_result.json', JSON.stringify({ error: e.message }));
    }
}
run();
