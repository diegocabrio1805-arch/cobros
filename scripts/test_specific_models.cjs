const https = require('https');
require('dotenv').config({ path: '.env' });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: No se encontró VITE_GEMINI_API_KEY en .env");
    process.exit(1);
}

const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash',
    'gemini-pro'
];

console.log(`🔑 Probando modelos con API Key: ${apiKey.substring(0, 5)}...`);

const runTest = async (model) => {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            contents: [{ parts: [{ text: "Hola" }] }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chuck => body += chuck);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ ${model}: FUNCIONA (200 OK)`);
                    resolve(true);
                } else {
                    console.log(`❌ ${model}: FALLÓ (${res.statusCode}) - ${body.substring(0, 100)}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.log(`❌ ${model}: Error de red - ${e.message}`);
            resolve(false);
        });

        req.write(data);
        req.end();
    });
};

(async () => {
    for (const model of modelsToTest) {
        await runTest(model);
    }
})();
