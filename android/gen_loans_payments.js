
const fs = require('fs');

function sqlValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
}

async function generateSQL(inputFile, tableName, prefix) {
    const raw = fs.readFileSync(inputFile, 'utf8');
    const data = JSON.parse(raw);
    const columns = Object.keys(data[0]);
    const batchSize = tableName === 'loans' ? 1000 : 500;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const chunkNum = Math.floor(i / batchSize) + 1;

        let sql = `BEGIN;\n\nINSERT INTO public.${tableName} (${columns.join(', ')}) VALUES\n`;
        const rows = batch.map(row => {
            return '(' + columns.map(col => sqlValue(row[col])).join(', ') + ')';
        });
        sql += rows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\nCOMMIT;';

        const filename = `./DATA_${prefix}_${chunkNum}.sql`;
        fs.writeFileSync(filename, sql);
    }
    console.log(`✅ Generados archivos para ${tableName}: ${data.length} registros.`);
}

generateSQL('./bak_loans.json', 'loans', 'loans');
generateSQL('./bak_payments.json', 'payments', 'payments');
