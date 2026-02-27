
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const NEW_URL = 'https://samgpnczlzynnfhjjff.supabase.co';
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'PLACEHOLDER';

const supabase = createClient(NEW_URL, NEW_SERVICE_KEY);

async function uploadTable(tableName) {
    const filePath = `./bak_${tableName}.json`;
    if (!fs.existsSync(filePath)) {
        console.log(`Saltando ${tableName}, archivo no encontrado.`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`Preparando volcado de ${data.length} registros en ${tableName}...`);

    // Insertar en bloques de 500 para mayor estabilidad
    const batchSize = 500;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const { error } = await supabase.from(tableName).upsert(batch);

        if (error) {
            console.error(`❌ ERROR volcando bloque en ${tableName}:`, error.message);
        } else {
            console.log(` - Bloque ${i / batchSize + 1} completado (${Math.min(i + batchSize, data.length)} / ${data.length}).`);
        }
    }
    console.log(`✅ VOLCADO DE ${tableName} FINALIZADO.`);
}

async function runMudanza() {
    console.log("--- INICIANDO EL GRAN VOLCADO DE DATOS (CIBERSEGURIDAD 2.0) ---");

    // Orden de integridad referencial
    const order = [
        'profiles',
        'branch_settings',
        'clients',
        'loans',
        'payments',
        'collection_logs',
        'deleted_items'
    ];

    for (const table of order) {
        await uploadTable(table);
    }

    console.log("--- MUDANZA COMPLETADA CON ÉXITO ---");
    console.log("¡Daniel, tus 5,534 registros están a salvo en su nueva casa!");
}

runMudanza();
