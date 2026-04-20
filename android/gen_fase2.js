
const fs = require('fs');

function generateInsert(tableName, data) {
    if (!data || data.length === 0) return '';
    const columns = Object.keys(data[0]);
    const chunks = [];
    const chunkSize = 50;
    for (let i = 0; i < data.length; i += chunkSize) {
        const batch = data.slice(i, i + chunkSize);
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
        chunks.push(sql + valuesRows);
    }
    return chunks.join('\n\n');
}

let finalSql = 'BEGIN;\n\n';
const tables = ['clients', 'loans'];

for (const table of tables) {
    const data = JSON.parse(fs.readFileSync(`./bak_${table}.json`, 'utf8'));
    console.log(`Generando SQL para ${table} (${data.length} registros)...`);
    finalSql += `-- DATA FOR ${table}\n`;
    finalSql += generateInsert(table, data);
    finalSql += '\n\n';
}

finalSql += 'COMMIT;';
fs.writeFileSync('./MUDANZA_Fase2.sql', finalSql);
console.log("✅ MUDANZA_Fase2.sql generado.");
