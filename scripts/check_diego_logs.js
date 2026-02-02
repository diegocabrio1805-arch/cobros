
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Buscando usuario 'diegoescribano'...");

    // 1. Encuentra el usuario
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', '%diego%');

    if (userError) {
        console.error("Error buscando usuario:", userError);
        return;
    }

    const targetUser = users.find(u => u.username.includes('diego'));

    if (!targetUser) {
        console.log("No se encontró usuario 'diego'.");
        return;
    }

    console.log(`Usuario encontrado: ${targetUser.name} (${targetUser.username}) - ID: ${targetUser.id}`);

    // 2. Busca logs de pagos para la fecha 29/01/2026 (campo 'date')
    const startOfDay = '2026-01-29T00:00:00';
    const endOfDay = '2026-01-29T23:59:59';

    //console.log(`Buscando pagos con fecha de registro (campo 'date') entre ${startOfDay} y ${endOfDay}...`);

    const { data: logs, error: logError } = await supabase
        .from('collection_logs')
        .select('id, amount, date, updated_at, client_id, type') // updated_at si existe
        .eq('recorded_by', targetUser.id)
        .gte('date', startOfDay)
        .lte('date', endOfDay);

    if (logError) {
        console.error("Error buscando logs por fecha:", logError);
    } else {
        console.log(`\n--- PAGOS CON FECHA DEL 29/01 (Encontrados: ${logs.length}) ---`);
        let totalAmount = 0;
        logs.forEach(l => {
            console.log(`- ID: ${l.id} | Monto: ${l.amount} | Tipo: ${l.type} | Fecha: ${l.date} | Subido: ${l.updated_at}`);
            totalAmount += l.amount || 0;
        });
        console.log(`Monto Total: $${totalAmount}`);
    }

    // 3. Busca logs creados/actualizados recientemente (29 o 30)
    console.log(`\nBuscando pagos ACTUALIZADOS/SUBIDOS (updated_at) desde el 29/01...`);

    const { data: logsCreated, error: logCreatedError } = await supabase
        .from('collection_logs')
        .select('id, amount, date, updated_at, client_id, type')
        .eq('recorded_by', targetUser.id)
        .gte('updated_at', startOfDay);

    if (logCreatedError) {
        console.error("Error buscando logs por updated_at:", logCreatedError);
    } else {
        if (logsCreated && logsCreated.length > 0) {
            console.log(`Encontrados ${logsCreated.length} logs subidos/actualizados recientemente.`);
            logsCreated.forEach(l => {
                // Marcar si la fecha 'date' NO es del 29
                const isDateMismatch = !l.date.startsWith('2026-01-29');
                if (isDateMismatch) {
                    // Solo mostrar los que no son del 29, para ver si hay pagos "perdidos" en otras fechas
                    console.log(`- [MALA FECHA?] Subido: ${l.updated_at} | Fecha Cobro: ${l.date} | Monto: ${l.amount}`);
                } else {
                    // Son del 29, ya deberían haber salido arriba
                }
            });
        }
    }
}

main();
