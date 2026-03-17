const fs = require('fs');
const https = require('https');
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

function queryTable(table) {
    return new Promise((resolve) => {
        const url = `https://samgpnczlznynnfhjjff.supabase.co/rest/v1/${table}?select=*`;
        let data = '';
        https.get(url, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } }, (res) => {
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
    });
}

async function run() {
    const users = await queryTable('profiles');
    
    users.forEach(u => {
        if (['FABIAN PEDROZO', 'ANEXO COBRADOR DE PRUEBA', 'ALTERFINZONA01'].includes(u.name)) {
            console.log(`User: ${u.name} (Role: ${u.role}, Managed By: ${u.managed_by})`);
        }
    });

    // Also get the admin ID
    const admin = users.find(u => u.name === 'DDANTE1983');
    console.log(`Admin ID: ${admin?.id}`);
}
run();
