const https = require('https');
const fs = require('fs');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

function req(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'samgpnczlznynnfhjjff.supabase.co',
            path: '/rest/v1/' + path,
            method: method,
            headers: { 
                'apikey': anonKey, 
                'Authorization': `Bearer ${anonKey}`,
                'Prefer': 'return=representation'
            }
        };
        
        if (body) {
            options.headers['Content-Type'] = 'application/json';
        }

        const r = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    resolve(data);
                }
            });
        });
        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

async function run() {
    try {
        console.log("===================================");
        console.log("1. Buscando a JUVE VILLALBA...");
        let users = await req('profiles?select=id,name');
        let juve = users.find(u => u.name && u.name.toUpperCase().includes('JUVE VILLALBA'));
        
        if (!juve) {
            throw new Error("No se pudo encontrar a JUVE VILLALBA en la base de datos.");
        }
        console.log("OK: Juve Villalba encontrado (ID: " + juve.id + ")");

        console.log("2. Buscando a IGNACIA RODRIGUEZ DE DOMINGUEZ...");
        let clients = await req('clients?select=id,name');
        let ignacia = clients.find(c => c.name && c.name.toUpperCase().includes('IGNACIA RODRIGUEZ'));
        
        if (!ignacia) {
            throw new Error("No se pudo encontrar a IGNACIA RODRIGUEZ en la base de datos.");
        }
        console.log("OK: Ignacia Rodriguez encontrada (ID: " + ignacia.id + ")");

        console.log("3. Transfiriendo prestamos...");
        let res = await req('loans?client_id=eq.' + ignacia.id, 'PATCH', { collector_id: juve.id, updated_at: new Date().toISOString() });
        
        let msg = "===================================\nEXITO TOTAL.\nSe mudaron los prestamos de " + ignacia.name + " al cobrador " + juve.name + " (" + res.length + " prestamos movidos).";
        console.log(msg);
        fs.writeFileSync('resultado_mudar.txt', msg);

    } catch(e) {
        let err = "ERROR: " + e.message;
        console.error(err);
        fs.writeFileSync('resultado_mudar.txt', err);
    }
}
run();
