
const fs = require('fs');

function sqlValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
}

function processTable(tableName, batchSize = 100) {
    const raw = fs.readFileSync(`./bak_${tableName}.json`, 'utf8');
    const data = JSON.parse(raw);
    if (!data || data.length === 0) {
        console.log(`${tableName}: vacío, omitido.`);
        return 0;
    }
    const columns = Object.keys(data[0]);
    let count = 0;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const chunkNum = Math.floor(i / batchSize) + 1;

        let sql = `BEGIN;\n\n`;
        sql += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES\n`;
        const rows = batch.map(row => '(' + columns.map(col => sqlValue(row[col])).join(', ') + ')');
        sql += rows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\nCOMMIT;';

        const filename = `./DATA_${tableName}_${chunkNum}.sql`;
        fs.writeFileSync(filename, sql);
        count++;
    }
    console.log(`✅ ${tableName}: ${data.length} registros → ${count} archivos (con ON CONFLICT DO NOTHING)`);
    return count;
}

console.log('Regenerando archivos con manejo de duplicados...\n');
const n1 = processTable('collection_logs', 100);
const n2 = processTable('payments', 100);
const n3 = processTable('deleted_items', 100);
console.log(`\n✅ LISTO:`);
console.log(`  - collection_logs: ${n1} archivos (DATA_collection_logs_1.sql a _${n1}.sql)`);
console.log(`  - payments: ${n2} archivos (DATA_payments_1.sql a _${n2}.sql)`);
console.log(`  - deleted_items: ${n3} archivos (DATA_deleted_items_1.sql a _${n3}.sql)`);
