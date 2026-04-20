const https = require('https');

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
        console.log("--- BUSCANDO EN SUPABASE ---");
        
        // Buscar cliente
        const clients = await querySupabase("clients?id=eq.3937299");
        console.log("RESULTADO CLIENTE (3937299):", JSON.stringify(clients, null, 2));

        // Buscar préstamos asociados
        const loans = await querySupabase("loans?client_id=eq.3937299");
        console.log("RESULTADO PRESTAMOS (Isabel):", JSON.stringify(loans, null, 2));

        // Buscar por nombre aproximado
        const clientsByName = await querySupabase("clients?name=ilike.*ISABEL*OLMEDO*");
        console.log("RESULTADO NOMBRE (ISABEL OLMEDO):", JSON.stringify(clientsByName, null, 2));

    } catch (error) {
        console.error("ERROR AL CONSULTAR:", error);
    }
})();
