-- =====================================================================
-- PARCHE: Eliminar Gerente en Cascada (Completamente de Supabase)
-- (CORREGIDO: Parámetros como TEXT para compatibilidad y campos correctos)
-- =====================================================================

-- Eliminamos la función anterior si existe
DROP FUNCTION IF EXISTS public.delete_manager_and_cascade(UUID);
DROP FUNCTION IF EXISTS public.delete_manager_and_cascade(TEXT);

CREATE OR REPLACE FUNCTION public.delete_manager_and_cascade(p_manager_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    collector_ids TEXT[];
BEGIN
    -- 1. Obtener los IDs de los cobradores de este gerente
    SELECT array_agg(id::text) INTO collector_ids
    FROM public.profiles
    WHERE managed_by::text = p_manager_id;

    -- 2. Eliminar logs (collection_logs) vinculados a clientes del gerente
    DELETE FROM public.collection_logs
    WHERE client_id::text IN (
        SELECT id::text FROM public.clients WHERE branch_id::text = p_manager_id
    );

    -- 3. Eliminar préstamos (loans) vinculados a clientes del gerente
    DELETE FROM public.loans
    WHERE client_id::text IN (
        SELECT id::text FROM public.clients WHERE branch_id::text = p_manager_id
    );

    -- 4. Eliminar clientes (clients) vinculados al gerente
    DELETE FROM public.clients
    WHERE branch_id::text = p_manager_id;

    -- 5. Eliminar gastos normales (expenses) vinculados al gerente o a sus cobradores
    -- La columna correcta en tu esquema es added_by, no user_id.
    DELETE FROM public.expenses
    WHERE branch_id::text = p_manager_id
       OR added_by::text = p_manager_id
       OR (collector_ids IS NOT NULL AND added_by::text = ANY(collector_ids));

    -- 5.1 Eliminar gastos aislados (isolated_expenses) de este gerente
    DELETE FROM public.isolated_expenses
    WHERE branch_id::text = p_manager_id;

    -- 6. Eliminar perfiles de cobradores y del gerente
    DELETE FROM public.profiles
    WHERE managed_by::text = p_manager_id OR id::text = p_manager_id;

    -- 7. Finalmente, eliminar de auth.users al gerente y a los cobradores
    DELETE FROM auth.users
    WHERE id::text = p_manager_id OR (collector_ids IS NOT NULL AND id::text = ANY(collector_ids));

END;
$$;
