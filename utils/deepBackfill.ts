import { SupabaseClient } from '@supabase/supabase-js';

// FASE 2: Deep Backfill de Historial (Más de 60 días)
export const runDeepBackfill = async (supabase: SupabaseClient, onDataFetched: (data: any) => void) => {
    try {
        console.log("[Sync] FASE 2: Iniciando Deep Backfill de historial (Silencioso)...");
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        
        const fetchAll = async (query: any) => {
            let allData: any[] = [];
            let page = 0;
            let hasMore = true;
            const PAGE_SIZE = 1000;
            
            while (hasMore) {
                const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                if (error) throw error;
                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    if (data.length < PAGE_SIZE) hasMore = false;
                    else page++;
                } else {
                    hasMore = false;
                }
                // Yield para no congelar la UI
                await new Promise(r => setTimeout(r, 60)); 
            }
            return { data: allData };
        };

        const pQuery = supabase.from('payments').select('*').lt('updated_at', sixtyDaysAgo).order('updated_at', { ascending: true });
        const lQuery = supabase.from('collection_logs').select('*').lt('updated_at', sixtyDaysAgo).order('updated_at', { ascending: true });

        const [pRes, lRes] = await Promise.all([
            fetchAll(pQuery),
            fetchAll(lQuery)
        ]);

        const pData = (pRes.data || []).map((p: any) => ({
            ...p, loanId: p.loan_id, clientId: p.client_id, branchId: p.branch_id,
            isRenewal: p.is_renewal, deletedAt: p.deleted_at
        }));

        const lData = (lRes.data || []).map((cl: any) => ({
            id: cl.id, type: cl.type, paymentId: cl.payment_id, amount: cl.amount,
            loanId: cl.loan_id, clientId: cl.client_id, timestamp: cl.timestamp, branchId: cl.branch_id,
            recordedBy: cl.recorded_by, collectorId: cl.collector_id, deletedAt: cl.deleted_at, isWatched: cl.is_watched
        }));

        if (pData.length > 0 || lData.length > 0) {
            console.log(`[Sync] FASE 2 Completada: ${pData.length} pagos históricos y ${lData.length} logs inyectados en la UI.`);
            // Pasamos los datos recolectados al motor de estado para que los fusione de forma incremental
            onDataFetched({ payments: pData, collectionLogs: lData });
        } else {
            console.log("[Sync] FASE 2 Completada: No hay historial antiguo para backfill.");
        }
    } catch (e) {
        console.warn("[Sync] FASE 2 Error (non-critical):", e);
    }
};
