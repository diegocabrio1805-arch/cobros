
const fs = require('fs');

function sqlValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
}

const data = JSON.parse(fs.readFileSync('./bak_loans.json', 'utf8'));
const columns = Object.keys(data[0]);
const batchSize = 40;

// Generate ALTER TABLE patch
let patch = `-- PARCHE DEFINITIVO: Recrear tabla loans con el esquema correcto\n`;
patch += `DROP TABLE IF EXISTS public.loans CASCADE;\n\n`;
patch += `CREATE TABLE public.loans (\n`;
patch += `  id TEXT PRIMARY KEY,\n`;
patch += `  client_id TEXT,\n`;
patch += `  branch_id TEXT,\n`;
patch += `  principal NUMERIC,\n`;
patch += `  total_amount NUMERIC,\n`;
patch += `  status TEXT,\n`;
patch += `  installments JSONB,\n`;
patch += `  created_at TIMESTAMPTZ DEFAULT NOW(),\n`;
patch += `  raw_data JSONB,\n`;
patch += `  collector_id TEXT,\n`;
patch += `  is_renewal BOOLEAN DEFAULT FALSE,\n`;
patch += `  custom_holidays JSONB,\n`;
patch += `  frequency TEXT,\n`;
patch += `  interest_rate NUMERIC,\n`;
patch += `  total_installments INTEGER,\n`;
patch += `  installment_value NUMERIC,\n`;
patch += `  updated_at TIMESTAMPTZ DEFAULT NOW(),\n`;
patch += `  deleted_at TIMESTAMPTZ\n`;
patch += `);\n`;

fs.writeFileSync('./PATCH_loans_schema.sql', patch);
console.log('✅ PATCH_loans_schema.sql generado.');

// Generate INSERT scripts
for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const chunkNum = Math.floor(i / batchSize) + 1;

    let sql = `BEGIN;\n\n`;
    sql += `INSERT INTO public.loans (${columns.join(', ')}) VALUES\n`;
    const rows = batch.map(row => {
        return '(' + columns.map(col => sqlValue(row[col])).join(', ') + ')';
    });
    sql += rows.join(',\n') + ';\n\nCOMMIT;';

    fs.writeFileSync(`./LOANS_CORRECT_${chunkNum}.sql`, sql);
    console.log(` - LOANS_CORRECT_${chunkNum}.sql generado (${batch.length} préstamos)`);
}
console.log(`\n✅ LISTO. Total: ${data.length} préstamos en ${Math.ceil(data.length / batchSize)} bloques.`);
