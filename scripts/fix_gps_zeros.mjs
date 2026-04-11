/**
 * fix_gps_zeros.mjs
 * 
 * Corrige registros de collection_logs que quedaron con coordenadas {lat:0, lng:0}
 * asignandoles la ubicacion del cliente o su domicilio.
 * 
 * Si el cliente no tiene ubicacion, usa la coordenada del centro de Asuncion.
 * 
 * SEGURO: Solo modifica registros con lat=0 AND lng=0 (ya estan mal).
 * No toca ningun registro con coordenadas reales.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

// Coordenada por defecto: centro de Asuncion, Paraguay
const DEFAULT_LOCATION = { lat: -25.2867, lng: -57.6470 };

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixGpsZeros() {
    console.log('=== FIX GPS ZEROS ===');
    console.log('Buscando registros con coordenada 0,0...\n');

    // 1. Obtener todos los logs con location {lat:0, lng:0}
    const { data: badLogs, error: logsErr } = await supabase
        .from('collection_logs')
        .select('id, client_id, location')
        .not('location', 'is', null);

    if (logsErr) {
        console.error('Error al obtener logs:', logsErr.message);
        process.exit(1);
    }

    // Filtrar los que tienen 0,0
    const zeroLogs = (badLogs || []).filter(log => {
        const loc = log.location;
        if (!loc) return false;
        const lat = typeof loc === 'string' ? JSON.parse(loc).lat : loc.lat;
        const lng = typeof loc === 'string' ? JSON.parse(loc).lng : loc.lng;
        return (lat === 0 || lat === '0') && (lng === 0 || lng === '0');
    });

    console.log(`Encontrados: ${zeroLogs.length} registros con coordenada 0,0`);

    if (zeroLogs.length === 0) {
        console.log('\nNo hay registros que corregir. Todo esta bien.');
        return;
    }

    // 2. Obtener ubicaciones de los clientes involucrados
    const clientIds = [...new Set(zeroLogs.map(l => l.client_id).filter(Boolean))];
    console.log(`Buscando ubicaciones de ${clientIds.length} clientes...`);

    const { data: clients, error: clientsErr } = await supabase
        .from('clients')
        .select('id, location, domicilio_location')
        .in('id', clientIds);

    if (clientsErr) {
        console.error('Error al obtener clientes:', clientsErr.message);
        process.exit(1);
    }

    // Construir mapa de ubicaciones: clientId -> mejor ubicacion disponible
    const clientLocationMap = {};
    (clients || []).forEach(c => {
        let loc = null;
        
        // Prioridad 1: domicilio_location
        if (c.domicilio_location) {
            const dl = typeof c.domicilio_location === 'string' ? JSON.parse(c.domicilio_location) : c.domicilio_location;
            if (dl && dl.lat && dl.lng && dl.lat !== 0 && dl.lng !== 0) {
                loc = { lat: dl.lat, lng: dl.lng };
            }
        }
        // Prioridad 2: location general del cliente
        if (!loc && c.location) {
            const cl = typeof c.location === 'string' ? JSON.parse(c.location) : c.location;
            if (cl && cl.lat && cl.lng && cl.lat !== 0 && cl.lng !== 0) {
                loc = { lat: cl.lat, lng: cl.lng };
            }
        }
        // Prioridad 3: Asuncion por defecto
        if (!loc) {
            loc = DEFAULT_LOCATION;
        }

        clientLocationMap[c.id] = loc;
    });

    // 3. Actualizar en lotes de 50
    let fixedCount = 0;
    let defaultCount = 0;
    const BATCH_SIZE = 50;

    console.log(`\nActualizando ${zeroLogs.length} registros...`);

    for (let i = 0; i < zeroLogs.length; i += BATCH_SIZE) {
        const batch = zeroLogs.slice(i, i + BATCH_SIZE);

        for (const log of batch) {
            const newLocation = clientLocationMap[log.client_id] || DEFAULT_LOCATION;
            const usedDefault = !clientLocationMap[log.client_id] || 
                (newLocation.lat === DEFAULT_LOCATION.lat && newLocation.lng === DEFAULT_LOCATION.lng);

            const { error: updateErr } = await supabase
                .from('collection_logs')
                .update({ 
                    location: newLocation,
                    updated_at: new Date().toISOString()
                })
                .eq('id', log.id);

            if (updateErr) {
                console.warn(`  [WARN] No se pudo actualizar log ${log.id}:`, updateErr.message);
            } else {
                fixedCount++;
                if (usedDefault) defaultCount++;
            }
        }
        console.log(`  Procesados: ${Math.min(i + BATCH_SIZE, zeroLogs.length)} / ${zeroLogs.length}`);
    }

    console.log('\n=== RESULTADO ===');
    console.log(`Total corregidos:     ${fixedCount}`);
    console.log(`Con ubicacion real:   ${fixedCount - defaultCount}`);
    console.log(`Con Asuncion default: ${defaultCount}`);
    console.log('\nListo! Recarga el mapa en la app para ver los cambios.');
}

fixGpsZeros().catch(err => {
    console.error('Error inesperado:', err);
    process.exit(1);
});
