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
} catch (e) {
    console.error("No se pudo leer el archivo .env:", e.message);
    process.exit(1);
}

if (!apiKey) {
    console.error("❌ NO se encontró VITE_GEMINI_API_KEY en el archivo .env");
    process.exit(1);
}

console.log(`🔑 Probando API Key: ${apiKey.substring(0, 5)}...`);

const data = JSON.stringify({
    contents: [
        {
            parts: [
                {
                    text: "Escribe una historia corta sobre un gato."
                }
            ]
        }
    ]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log("✅ ÉXITO: El modelo 'gemini-2.0-flash' funciona correctamente.");
            try {
                const response = JSON.parse(body);
                if (response.candidates && response.candidates[0].content) {
                    console.log("Respuesta:", response.candidates[0].content.parts[0].text);
                }
            } catch (e) {
                console.log("Respuesta raw:", body.substring(0, 200));
            }
        } else {
            console.error(`❌ ERROR: Falló con código ${res.statusCode}`);
            console.error("Detalles:", body);
        }
    });
});

req.on('error', (error) => {
    console.error("❌ Error de red:", error);
});

req.write(data);
req.end();
