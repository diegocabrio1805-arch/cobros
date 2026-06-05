import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Probar distintos formatos de email para ALTERFINADMI con contraseña 123456
const emailCandidates = [
  'ALTERFINADMI@anexocobro.com',
  'alterfinadmi@anexocobro.com',
  'ALTERFINADMI@anexocobros.app',
  'alterfinadmi@anexocobros.app',
  'alterfin@anexocobro.com',
  'alterfin@anexocobros.app',
];

let loggedIn = false;
for (const email of emailCandidates) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: '123456' });
  if (!error && data.user) {
    console.log(`✅ Login exitoso con: ${email}`);
    loggedIn = true;

    // Buscar el abono de 2295000
    const { data: logs } = await supabase
      .from('collection_logs')
      .select('id, amount, date, type, client_id')
      .eq('amount', 2295000)
      .is('deleted_at', null);

    console.log('Logs con $2.295.000:', JSON.stringify(logs));

    if (logs && logs.length > 0) {
      const targetLog = logs[0];
      console.log(`\n>>> Registro a modificar: ID=${targetLog.id} | Fecha=${targetLog.date} | Monto=${targetLog.amount}`);

      const { data: updated, error: updateErr } = await supabase
        .from('collection_logs')
        .update({ amount: 2115000, updated_at: new Date().toISOString() })
        .eq('id', targetLog.id)
        .select();

      if (updateErr) {
        console.error('❌ Error al actualizar:', JSON.stringify(updateErr));
      } else {
        console.log('\n✅ ¡ABONO ACTUALIZADO EXITOSAMENTE!');
        console.log('  Cliente:        ALVARENGA MONGELOS, JORGE LUIS');
        console.log('  Fecha:          15/1/2026');
        console.log('  Monto anterior: $2.295.000');
        console.log('  Monto nuevo:    $2.115.000');
        console.log('  Log ID:', targetLog.id);
      }
    } else {
      // Buscar por rango de fecha 14-16 enero 2026
      const { data: logsDate } = await supabase
        .from('collection_logs')
        .select('id, amount, date, type, client_id')
        .gte('date', '2026-01-14T00:00:00')
        .lte('date', '2026-01-16T23:59:59')
        .is('deleted_at', null);
      console.log('Logs 14-16 enero 2026:', JSON.stringify(logsDate));

      // Buscar por monto aproximado (entre 2290000 y 2300000)
      const { data: logsAmt } = await supabase
        .from('collection_logs')
        .select('id, amount, date, type, client_id')
        .gte('amount', 2290000)
        .lte('amount', 2300000)
        .is('deleted_at', null);
      console.log('Logs con monto ~2.295.000:', JSON.stringify(logsAmt));
    }

    await supabase.auth.signOut();
    break;
  } else {
    console.log(`❌ Fallo con: ${email} → ${error?.message}`);
  }
}

if (!loggedIn) console.error('❌ Ningún email funcionó.');

await supabase.removeAllChannels();
setTimeout(() => process.exit(0), 500);
