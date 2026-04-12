
const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabaseUrl = 'samgpnczlznynnfhjjff.supabase.co';

async function checkFabianData() {
    // 1. Find Fabian Arrua
    const usersPath = `/rest/v1/profiles?name=ilike.*fabian*arrua*&select=*`;
    
    const options = {
        hostname: supabaseUrl,
        headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    };

    const fetch = (path) => new Promise((resolve, reject) => {
        https.get({...options, path}, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    const users = await fetch(usersPath);
    console.log("Users found:", JSON.stringify(users, null, 2));

    if (users.length > 0) {
        const fabianId = users[0].id;
        // 2. Count active loans for this ID
        const loansPath = `/rest/v1/loans?collector_id=eq.${fabianId}&status=eq.Activo&select=count`;
        const loans = await fetch(loansPath);
        console.log("Active loans for Fabian:", loans);
    }
}

checkFabianData().catch(console.error);
