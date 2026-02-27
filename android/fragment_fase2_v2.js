
const fs = require('fs');
const path = require('path');

function sqlValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
}

function processTable(tableName) {
    const raw = fs.readFileSync(`./bak_${tableName}.json`, 'utf8');
    const data = JSON.parse(raw);
    console.log(`Tabla ${tableName}: ${data.length} registros found.`);

    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const batchSize = 50;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const chunkNum = Math.floor(i / batchSize) + 1;

        let sql = `BEGIN;\n\n`;
        sql += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES\n`;

        const rows = batch.map(row => {
            return '(' + columns.map(col => sqlValue(row[col])).join(', ') + ')';
        });

        sql += rows.join(',\n') + ';\n\n';
        sql += `COMMIT;`;

        fs.writeFileSync(`./CHUNK_${tableName}_${chunkNum}.sql`, sql);
        console.log(` - CHUNK_${tableName}_${chunkNum}.sql escrito (${sql.length} bytes).`);
    }
}

processTable('clients');
processTable('loans');
