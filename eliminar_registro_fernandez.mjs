// Script: eliminar_registro_fernandez.mjs
// Elimina el registro fantasma de FERNANDEZ DURE, EULALIO (~21:00 PY / 00:00 UTC del 22/07/2026)
// Uso: node eliminar_registro_fernandez.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Rango: el registro aparece como 22/07/2026 00:00 UTC (= 21:00 PY del 21/07)
// Ampliamos el rango para cubrir ambas posibilidades
const from = '2026-07-21T00:00:00.000Z';
const to   = '2026-07-22T03:00:00.000Z';
const TARGET_AMOUNT = 1018020;

console.log('\n🔍 Buscando registro de FERNANDEZ DURE, EULALIO...\n');

// 1. Buscar sin filtro GPS — solo por rango de fecha
const { data: found, error: findErr } = await supabase
  .from('collection_logs')
  .select('*')
  .gte('date', from)
  .lte('date', to);

if (findErr) {
  console.error('❌ Error al buscar:', findErr.message);
  process.exit(1);
}

if (!found || found.length === 0) {
  console.log('ℹ️  No se encontraron registros en ese rango de fecha.');
  console.log('   El registro puede estar solo en caché local del navegador.');
  console.log('   → Solución: Ctrl+Shift+R en el navegador del admin para limpiar caché.\n');
  process.exit(0);
}

console.log(`📋 Registros encontrados en el rango: ${found.length}`);
found.forEach(r => {
  const hora = new Date(r.date).toLocaleString('es-PY');
  const monto = r.amount;
  const loc = JSON.stringify(r.location);
  console.log(`   → ID: ${r.id} | Fecha: ${hora} | Monto: ${monto} | GPS: ${loc}`);
});

// 2. Filtrar el registro objetivo por monto
const targets = found.filter(r => {
  const amt = Number(r.amount);
  return Math.abs(amt - TARGET_AMOUNT) < 100; // tolerancia de 100 gs
});

if (targets.length === 0) {
  console.log(`\nℹ️  Ningún registro tiene monto ~${TARGET_AMOUNT}.`);
  console.log('   El registro puede estar solo en caché local del navegador.');
  console.log('   → Solución: Ctrl+Shift+R en el navegador del admin para limpiar caché.\n');
  process.exit(0);
}

console.log(`\n⚠️  Registro objetivo encontrado: ${targets.length}`);
targets.forEach(r => {
  console.log(`   → ID: ${r.id} | Fecha: ${new Date(r.date).toLocaleString('es-PY')} | Monto: ${r.amount}`);
});

// 3. Eliminar payments relacionados
const ids = targets.map(r => r.id);
console.log('\n🗑️  Eliminando payments relacionados...');
const { error: payErr } = await supabase.from('payments').delete().in('logId', ids);
if (payErr) console.warn('   ⚠️  payments:', payErr.message);
else console.log('   ✅ payments eliminados.');

// 4. Eliminar los collection_logs
console.log('🗑️  Eliminando collection_logs...');
const { error: delErr } = await supabase.from('collection_logs').delete().in('id', ids);
if (delErr) {
  console.error('❌ Error al eliminar:', delErr.message);
  process.exit(1);
}

console.log(`\n✅ LISTO. Registro de FERNANDEZ DURE eliminado correctamente.`);
console.log('   Recargá la app (Ctrl+Shift+R) para confirmar.\n');
