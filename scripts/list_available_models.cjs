const https = require('https');
require('dotenv').config({ path: '.env' });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: No se encontró VITE_GEMINI_API_KEY en .env");
    process.exit(1);
}

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${apiKey}`,
    method: 'GET',
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const data = JSON.parse(body);
                console.log("✅ Modelos disponibles:");
                data.models.forEach(m => {
                    // Filter only generateContent supported models
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(`- ${m.name} (${m.displayName})`);
                    }
                });
            } catch (e) {
                console.error("Error parseando respuesta:", e);
            }
        } else {
            console.log(`❌ Error listando modelos (${res.statusCode}): ${body}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`Error de red: ${e.message}`);
});

req.end();
