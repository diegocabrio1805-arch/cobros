
const fs = require('fs');

function sqlValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
}

// Load backup
const raw = fs.readFileSync('./bak_clients.json', 'utf8');
const data = JSON.parse(raw);
const columns = Object.keys(data[0]);
const batchSize = 50;
let fileCount = 0;

for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const chunkNum = Math.floor(i / batchSize) + 1;

    let sql = `BEGIN;\n\nINSERT INTO public.clients (${columns.join(', ')}) VALUES\n`;
    const rows = batch.map(row => {
        // Fix is_active and is_hidden to not be null
        if (row.is_active === null || row.is_active === undefined) row.is_active = true;
        if (row.is_hidden === null || row.is_hidden === undefined) row.is_hidden = false;
        return '(' + columns.map(col => sqlValue(row[col])).join(', ') + ')';
    });
    sql += rows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\nCOMMIT;';

    const filename = `./DATA_clients_${chunkNum}.sql`;
    fs.writeFileSync(filename, sql);
    fileCount++;
}

console.log(`✅ Generados ${fileCount} archivos para ${data.length} clientes`);
console.log(`Archivos: DATA_clients_1.sql hasta DATA_clients_${fileCount}.sql`);
