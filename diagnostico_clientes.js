const https = require('https');

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'samgpnczlznynnfhjjff.supabase.co',
      path: '/rest/v1/' + path,
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), count: res.headers['content-range'] }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== DIAGNÓSTICO DE CLIENTES EN SUPABASE ===\n');

  // 1. Total de clientes en Supabase (SIN FILTRO)
  const allClients = await apiGet('clients?select=id,name,branch_id,added_by,is_active,deleted_at&order=added_by');
  if (allClients.status !== 200) {
    console.error('Error al conectar:', allClients.status, allClients.body);
    return;
  }
  const clients = allClients.body;
  console.log(`Total clientes en Supabase: ${clients.length}`);

  // 2. Clientes CON deleted_at (eliminados)
  const deleted = clients.filter(c => c.deleted_at);
  console.log(`  - Con deleted_at (eliminados): ${deleted.length}`);

  // 3. Clientes con is_active = false
  const inactive = clients.filter(c => c.is_active === false);
  console.log(`  - Con is_active = false: ${inactive.length}`);

  // 4. Clientes cuyo branch_id NO es el del admin
  const wrongBranch = clients.filter(c => c.branch_id && c.branch_id !== ADMIN_ID && !c.deleted_at && c.is_active !== false);
  console.log(`  - Activos con branch_id diferente al admin: ${wrongBranch.length}`);

  // 5. Clientes sin branch_id y sin added_by del admin/cobradores
  const noBranch = clients.filter(c => !c.branch_id && !c.deleted_at && c.is_active !== false);
  console.log(`  - Activos sin branch_id: ${noBranch.length}`);

  console.log('\n=== CLIENTES QUE SE MUESTRAN EN APP (branch_id = admin) ===');
  const visible = clients.filter(c => !c.deleted_at && c.is_active !== false && c.branch_id === ADMIN_ID);
  console.log(`Total visibles: ${visible.length}`);

  console.log('\n=== CLIENTES ACTIVOS CON OTRO branch_id ===');
  wrongBranch.slice(0, 20).forEach(c => {
    console.log(`  ${c.name} | added_by: ${c.added_by} | branch_id: ${c.branch_id}`);
  });

  console.log('\n=== COBRADORES EN SUPABASE ===');
  const profiles = await apiGet('profiles?select=id,name,role,managed_by');
  if (profiles.status === 200) {
    profiles.body.forEach(p => {
      console.log(`  ${p.name} | role: ${p.role} | managed_by: ${p.managed_by || 'null'}`);
    });
  }

  console.log('\n=== RESUMEN ===');
  console.log(`Clientes totales en BD: ${clients.length}`);
  console.log(`Clientes visibles en app: ${visible.length}`);
  console.log(`Clientes ocultos (filtrados): ${clients.length - visible.length - deleted.length - inactive.length} (branch_id incorrecto)`);
  console.log(`Clientes eliminados: ${deleted.length}`);
  console.log(`Clientes inactivos: ${inactive.length}`);
}

main().catch(e => console.error('Fatal:', e.message));
