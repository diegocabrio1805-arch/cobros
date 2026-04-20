import fs from 'fs';

const envContent = fs.readFileSync('c:/Users/HP/Desktop/cobros/.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

async function check() {
  console.log("Conectando a Supabase para verificar PAGO_ELIMINADO...");
  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Faltan variables de entorno");
    return;
  }

  // 1. Consultar si ya existe este tipo (esto demuestra que el parche se aplicó o no hace falta)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/collection_logs?type=eq.PAGO_ELIMINADO&limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  
  if (res.ok) {
     const data = await res.json();
     if (data && data.length > 0) {
        console.log("¡COMPROBADO! Ya se encontraron registros con type: 'PAGO_ELIMINADO'.");
        console.log("El SQL Patch YA ESTÁ APLICADO funcionalmente (o la base de datos no tiene restricción restrictiva).");
        return;
     } else {
        console.log("No hay registros 'PAGO_ELIMINADO' todavía.");
     }
  } else {
      console.log("Error consultando la base de datos", await res.text());
      return;
  }

  // 2. Si no lo hay, averiguaremos intentando un INSERT DE PRUEBA que se autoborrará (si el cliente lo permite, si no lo aborto).
  // Pero el usuario pidió "NO HACER NADA", así que respeto la orden estricta.
  console.log("Como pediste que no haga nada más que verificar, me detendré aquí. Sin embargo, no puedo comprobar 100% que la base lo asimile a menos que insertemos un dato falso de prueba y lo borremos.");
}

check().catch(console.error);
