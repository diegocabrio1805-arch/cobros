const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
    }
} catch (e) { console.error("Error leyendo .env"); process.exit(1); }

if (!apiKey) { console.error("No API Key"); process.exit(1); }

console.log(`🔑 Probando modelos con API Key: ${apiKey.substring(0, 5)}...`);

const testModel = (modelName) => {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            contents: [{ parts: [{ text: "Hola" }] }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                resolve({ model: modelName, status: res.statusCode, body: body });
            });
        });

        req.on('error', () => resolve({ model: modelName, status: 0, body: 'Error red' }));
        req.write(data);
        req.end();
    });
};

const getModels = () => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models?key=${apiKey}`,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const list = JSON.parse(body);
                    resolve(list.models || []);
                } catch (e) { resolve([]); }
            });
        });
        req.end();
    });
};

(async () => {
    console.log("📋 Obteniendo lista de modelos disponibles...");
    const models = await getModels();
    const candidateNames = models.map(m => m.name.replace('models/', ''));

    // Add some common defaults just in case list fails or misses them
    const defaults = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
    const allToTest = [...new Set([...candidateNames, ...defaults])];

    console.log(`🔍 Probando ${allToTest.length} modelos: ${allToTest.join(', ')}`);
    console.log("---------------------------------------------------");

    for (const model of allToTest) {
        process.stdout.write(`Probando ${model}... `);
        const result = await testModel(model);

        if (result.status === 200) {
            console.log("✅ ÉXITO (200 OK)");
            console.log(`\n🎉 EL MODELO GANADOR ES: ${model}`);
            console.log("Actualiza el código para usar este modelo.");
            process.exit(0);
        } else {
            console.log(`❌ FALLÓ (${result.status})`);
            // Only print details if it's not a generic 404
            if (result.status !== 404) {
                // Clean up output a bit
                const errSample = result.body.substring(0, 100).replace(/\n/g, ' ');
                console.log(`   └-> ${errSample}...`);
            }
        }
        // Small delay to avoid aggressive rate limiting during test
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("\n❌ Ningún modelo funcionó correctamente con esta API Key en este momento.");
})();
