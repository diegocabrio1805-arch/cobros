-- =====================================================================
-- PARCHE RLS: Permitir que cobradores vean TODOS los logs de sus clientes
-- Problema: Logs con branch_id = NULL quedan bloqueados por la política actual
-- Solución: Ampliar política para incluir logs de clientes de su sucursal
-- =====================================================================

-- 1. Eliminar política restrictiva actual del cobrador
DROP POLICY IF EXISTS "Cobrador gestiona sus propios logs" ON public.collection_logs;

-- 2. Nueva política: cobrador ve logs donde él registró
--    OR el branch_id coincide con su manager
--    OR el client_id pertenece a un cliente de su sucursal (aunque branch_id sea NULL)
CREATE POLICY "Cobrador gestiona sus propios logs" ON public.collection_logs FOR ALL USING (
  recorded_by = auth.uid()::text
  OR branch_id = public.get_my_manager()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE branch_id = public.get_my_manager()
  )
  OR loan_id IN (
    SELECT id FROM public.loans 
    WHERE branch_id = public.get_my_manager()
  )
);

-- 3. (OPCIONAL pero recomendado) Rellenar branch_id nulos en collection_logs
--    para limpiar los datos legacy y evitar este problema en el futuro
UPDATE public.collection_logs cl
SET branch_id = c.branch_id
FROM public.clients c
WHERE cl.client_id = c.id
  AND cl.branch_id IS NULL
  AND c.branch_id IS NOT NULL;

-- También parchar por loan si no tiene client_id
UPDATE public.collection_logs cl
SET branch_id = l.branch_id
FROM public.loans l
WHERE cl.loan_id = l.id
  AND cl.branch_id IS NULL
  AND l.branch_id IS NOT NULL;

-- 4. Verificar cuántos logs quedaron aún sin branch_id
SELECT COUNT(*) AS logs_sin_branch_id_pendientes
FROM public.collection_logs
WHERE branch_id IS NULL AND deleted_at IS NULL AND type = 'PAYMENT';
