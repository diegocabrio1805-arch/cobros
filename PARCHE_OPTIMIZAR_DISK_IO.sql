-- ==============================================================================
-- PARCHE DE OPTIMIZACIÓN DE RENDIMIENTO Y REDUCCIÓN DE DISK IO
-- ==============================================================================
-- Al ejecutar este script, se crearán los índices B-Tree necesarios para las consultas
-- de sincronización incremental de Anexo Cobro.
-- Esto evitará "Full Table Scans" en cada refresco (cada 60 segundos por dispositivo)
-- reduciendo dramáticamente el consumo de Disk IO en Supabase.
-- ==============================================================================

-- 1. Índices en la columna 'updated_at' para sincronización rápida
CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON public.clients(updated_at);
CREATE INDEX IF NOT EXISTS idx_loans_updated_at ON public.loans(updated_at);
CREATE INDEX IF NOT EXISTS idx_payments_updated_at ON public.payments(updated_at);
CREATE INDEX IF NOT EXISTS idx_collection_logs_updated_at ON public.collection_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_branch_settings_updated_at ON public.branch_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_expenses_updated_at ON public.expenses(updated_at);
CREATE INDEX IF NOT EXISTS idx_isolated_expenses_updated_at ON public.isolated_expenses(updated_at);
CREATE INDEX IF NOT EXISTS idx_simulated_orders_updated_at ON public.simulated_orders(updated_at);

-- 2. Índices en la columna 'deleted_at' para la purga de eliminados
CREATE INDEX IF NOT EXISTS idx_deleted_items_deleted_at ON public.deleted_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients(deleted_at);

-- 3. Índice compuesto especializado para la tabla de registros (collection_logs)
-- Optimiza la consulta intensiva: .eq('type', 'PAGO_ELIMINADO').gt('date', noventaDiasAtras).order('date')
CREATE INDEX IF NOT EXISTS idx_collection_logs_type_date ON public.collection_logs(type, date DESC);

-- Opcional pero recomendado: un índice en la fecha sola de collection_logs
CREATE INDEX IF NOT EXISTS idx_collection_logs_date ON public.collection_logs(date DESC);

-- Mensaje de confirmación (solo visible en logs de consola de postgres si se ejecuta desde psql)
DO $$ BEGIN RAISE NOTICE 'Índices creados exitosamente. El consumo de Disk IO se reducirá inmediatamente.'; END $$;
