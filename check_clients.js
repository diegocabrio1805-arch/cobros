const fs = require('fs');
const statePath = './virtual_mapping_v3.js'; // The DB script from earlier is already there, but we can query Supabase directly
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
    const clients = await queryTable('clients');
    const loans = await queryTable('loans');
    const users = await queryTable('profiles');
    
    console.log(`CLIENTS: ${clients.length}`);
    console.log(`LOANS: ${loans.length}`);
    
    const adminId = 'd0c92131-4171-460b-85d1-42e88241e06f'; // Admin DDANTE1983... usually. We will map.
    
    // Print all collectors and their client count
    users.filter(u => u.role === 'collector').forEach(c => {
        const theirClients = clients.filter(cl => cl.added_by === c.id);
        const theirLoans = loans.filter(l => l.collector_id === c.id);
        const clientsWithLoans = new Set(theirLoans.map(l => l.client_id));
        
        console.log(`Collector: ${c.name} (manager: ${c.managed_by})`);
        console.log(`  Added By count: ${theirClients.length}`);
        console.log(`  Loans assigned count: ${theirLoans.length} (unique clients: ${clientsWithLoans.size})`);
    });
}
run();
