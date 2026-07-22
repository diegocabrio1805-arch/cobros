// Script: borrar_pago_sin_gps.mjs
// Elimina registros de 'collection_logs' del dia de ayer que tengan lat=0 / lng=0
// Uso: node borrar_pago_sin_gps.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Rango: ayer completo (zona horaria local -03:00)
const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0).toISOString();
const to   = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();

console.log(`\n🔍 Buscando registros SIN GPS del ${yesterday.toLocaleDateString('es-PY')}...`);
console.log(`   Rango: ${from} → ${to}\n`);

// 1. Buscar primero (para mostrar qué se va a eliminar)
const { data: found, error: findErr } = await supabase
  .from('collection_logs')
  .select('id, date, type, amount, location')
  .gte('date', from)
  .lte('date', to)
  .eq('type', 'PAYMENT');

if (findErr) {
  console.error('❌ Error al buscar registros:', findErr.message);
  process.exit(1);
}

// Filtrar los que tienen lat=0 y lng=0 (sin GPS real)
const sinGps = (found || []).filter(r => {
  const loc = r.location;
  if (!loc) return true; // sin ubicación
  if (typeof loc === 'string') {
    try {
      const parsed = JSON.parse(loc);
      return (parsed.lat === 0 || parsed.lat === '0') && (parsed.lng === 0 || parsed.lng === '0');
    } catch { return true; }
  }
  return (loc.lat === 0 || loc.lat === '0') && (loc.lng === 0 || loc.lng === '0');
});

if (sinGps.length === 0) {
  console.log('✅ No se encontraron registros sin GPS de ayer. La base de datos está limpia.\n');
  process.exit(0);
}

console.log(`⚠️  Registros sin GPS encontrados: ${sinGps.length}`);
sinGps.forEach(r => {
  const hora = new Date(r.date).toLocaleTimeString('es-PY');
  console.log(`   → ID: ${r.id} | Hora: ${hora} | Tipo: ${r.type} | Monto: ${r.amount}`);
});

// 2. También borrar los payments relacionados
const ids = sinGps.map(r => r.id);

console.log('\n🗑️  Eliminando pagos relacionados en tabla "payments"...');
const { error: payErr } = await supabase
  .from('payments')
  .delete()
  .in('logId', ids);

if (payErr) {
  console.warn('   ⚠️  No se pudo limpiar tabla payments:', payErr.message);
} else {
  console.log('   ✅ Payments relacionados eliminados.');
}

// 3. Eliminar los logs
console.log('\n🗑️  Eliminando collection_logs sin GPS...');
const { error: delErr } = await supabase
  .from('collection_logs')
  .delete()
  .in('id', ids);

if (delErr) {
  console.error('❌ Error al eliminar:', delErr.message);
  process.exit(1);
}

console.log(`\n✅ LISTO. Se eliminaron ${sinGps.length} registro(s) sin GPS de ayer.\n`);
