
const fs = require('fs');

function generateInsertBatch(tableName, data, start, size) {
    const batch = data.slice(start, start + size);
    if (batch.length === 0) return '';
    const columns = Object.keys(batch[0]);
    let sql = `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES\n`;
    const valuesRows = batch.map(row => {
        return '(' + columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
        }).join(', ') + ')';
    }).join(',\n') + ';';
    return sql;
}

const tables = ['clients', 'loans'];
const batchSize = 50;

for (const table of tables) {
    const data = JSON.parse(fs.readFileSync(`./bak_${table}.json`, 'utf8'));
    console.log(`Procesando ${table}: ${data.length} registros...`);

    for (let i = 0; i < data.length; i += batchSize) {
        let sql = 'BEGIN;\n\n';
        sql += generateInsertBatch(table, data, i, batchSize);
        sql += '\n\nCOMMIT;';
        const chunkNum = Math.floor(i / batchSize) + 1;
        fs.writeFileSync(`./CHUNK_${table}_${chunkNum}.sql`, sql);
        console.log(` - Generado CHUNK_${table}_${chunkNum}.sql`);
    }
}
