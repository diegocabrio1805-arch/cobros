
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const OLD_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(OLD_URL, OLD_KEY);

async function fetchAll(tableName) {
    let allData = [];
    let from = 0;
    const step = 1000;
    let finished = false;

    console.log(`Extrayendo ${tableName} exhaustivamente...`);

    while (!finished) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(from, from + step - 1);

        if (error) {
            console.error(`ERROR en ${tableName}:`, error.message);
            finished = true;
        } else {
            allData = allData.concat(data);
            console.log(` - Rescatados ${allData.length} registros de ${tableName}...`);
            if (data.length < step) {
                finished = true;
            } else {
                from += step;
            }
        }
    }
    return allData;
}

async function exportData() {
    console.log("--- INICIANDO RESCATE DE DATOS MASIVO ---");

    const tables = ['clients', 'loans', 'payments', 'collection_logs', 'expenses', 'profiles', 'branch_settings', 'deleted_items'];

    for (const table of tables) {
        const data = await fetchAll(table);
        if (data.length > 0) {
            fs.writeFileSync(`./bak_${table}.json`, JSON.stringify(data, null, 2));
            console.log(`✅ TOTAL ${table}: ${data.length} registros guardados.`);
        }
    }
    console.log("--- RESCATE COMPLETADO CON ÉXITO ---");
}

exportData();
