const fs = require('fs');

function generateInsert(tableName, data) {
    if (!data || data.length === 0) return '';

    const columns = Object.keys(data[0]);
    const chunks = [];
    const chunkSize = 100; // Bloques de 100 para no saturar el editor

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

const tableGroups = {
    '1_ESTRUCTURA_BASE': ['profiles', 'branch_settings', 'clients', 'loans'],
    '2_HISTORIA_PAGOS': ['payments', 'collection_logs', 'deleted_items']
};

for (const [fileName, tables] of Object.entries(tableGroups)) {
    let finalSql = 'BEGIN;\n\n';
    for (const table of tables) {
        const path = `./bak_${table}.json`;
        if (fs.existsSync(path)) {
            const data = JSON.parse(fs.readFileSync(path, 'utf8'));
            console.log(`Generando ${fileName} - ${table} (${data.length} registros)...`);
            finalSql += `-- DATA FOR ${table}\n`;
            finalSql += generateInsert(table, data);
            finalSql += '\n\n';
        }
    }
    finalSql += 'COMMIT;';
    fs.writeFileSync(`./${fileName}.sql`, finalSql);
    console.log(`✅ Archivo ${fileName}.sql generado.`);
}
