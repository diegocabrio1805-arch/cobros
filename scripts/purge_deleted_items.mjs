import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanDeletedItems() {
    console.log('Iniciando limpieza de deleted_items...');
    
    // Contamos antes
    const { count: initialCount } = await supabase.from('deleted_items').select('*', { count: 'exact', head: true });
    console.log(`Borrando registros... Conteo inicial: ${initialCount}`);

    let hasMore = true;
    let totalDeleted = 0;

    // Eliminamos en lotes de 1000 para no sobrecargar
    while (hasMore) {
        // Seleccionamos los IDs de los 1000 registros más antiguos a borrar para no atorarnos
        const { data, error: selectErr } = await supabase.from('deleted_items').select('id').order('deleted_at', { ascending: false }).limit(2000);
        
        if (selectErr) {
            console.error('Error al obtener registros:', selectErr);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
            break;
        }

        const idsToDelete = data.map(d => d.id);
        
        const { error: deleteErr } = await supabase.from('deleted_items').delete().in('id', idsToDelete);

        if (deleteErr) {
            console.error('Error al borrar lote:', deleteErr);
            break;
        }

        totalDeleted += idsToDelete.length;
        console.log(`Borrados ${totalDeleted} registros hasta ahora...`);
        
        if (data.length < 2000) {
            hasMore = false;
        }
    }

    const { count: finalCount } = await supabase.from('deleted_items').select('*', { count: 'exact', head: true });
    console.log(`Limpieza terminada. Conteo final: ${finalCount}`);
}

cleanDeletedItems();
