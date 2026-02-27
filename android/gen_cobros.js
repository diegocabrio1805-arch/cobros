
const fs = require('fs');

function sqlValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
}

function processTable(tableName, batchSize = 50) {
    const raw = fs.readFileSync(`./bak_${tableName}.json`, 'utf8');
    const data = JSON.parse(raw);
    if (!data || data.length === 0) {
        console.log(`${tableName}: vacío, omitido.`);
        return;
    }
    const columns = Object.keys(data[0]);
    console.log(`${tableName}: ${data.length} registros, columnas: ${columns.join(', ')}`);

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const chunkNum = Math.floor(i / batchSize) + 1;

        let sql = `BEGIN;\n\n`;
        sql += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES\n`;
        const rows = batch.map(row => '(' + columns.map(col => sqlValue(row[col])).join(', ') + ')');
        sql += rows.join(',\n') + ';\n\nCOMMIT;';

        const filename = `./DATA_${tableName}_${chunkNum}.sql`;
        fs.writeFileSync(filename, sql);
    }
    console.log(` -> ${Math.ceil(data.length / batchSize)} archivos generados para ${tableName}.`);
}

processTable('collection_logs', 100);
processTable('payments', 100);
processTable('deleted_items', 100);
