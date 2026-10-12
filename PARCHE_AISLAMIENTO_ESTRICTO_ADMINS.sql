-- ==============================================================================
-- PARCHE DE SEGURIDAD ESTRICTA Y AISLAMIENTO MULTI-TENANT (ADMINISTRADORES)
-- Anexo Cobro - Samgpnczlznynnfhjjff
-- ==============================================================================
-- OBJETIVO:
-- Impedir que un Administrador descargue o consulte clientes, préstamos, pagos,
-- logs, gastos o perfiles pertenecientes a otras sucursales / administradores.
-- Cada administrador queda 100% aislado a su sucursal (branch_id = auth.uid()).
-- ==============================================================================

-- 1. Helper Function: Obtener el branch_id del usuario actual
-- Si es Admin/Gerente, su branch es su propio ID.
-- Si es Cobrador, su branch es el ID de su manager.
CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    CASE 
      WHEN role IN ('Administrador', 'Gerente') THEN id::text
      WHEN role = 'Cobrador' THEN managed_by::text
      ELSE NULL
    END,
    auth.uid()::text
  )
  FROM public.profiles 
  WHERE id = auth.uid()::text;
$$;

-- 2. POLÍTICAS PARA PROFILES
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Aislamiento Estricto por Dueño - Perfiles" ON public.profiles;

CREATE POLICY "Aislamiento por Sucursal - Profiles" ON public.profiles
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        -- Puede verse a sí mismo
        id = auth.uid()::text
        -- O ver a los cobradores/personal a su cargo
        OR managed_by = auth.uid()::text
        -- O si es cobrador, ver a su administrador/gerente
        OR id = (SELECT managed_by FROM public.profiles WHERE id = auth.uid()::text)
    )
);

-- 3. POLÍTICAS PARA CLIENTS
DROP POLICY IF EXISTS "Admin gestiona clientes" ON public.clients;
DROP POLICY IF EXISTS "Aislamiento Estricto por Sucursal - Clientes" ON public.clients;

CREATE POLICY "Aislamiento Estricto por Sucursal - Clientes" ON public.clients
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        branch_id::text = public.get_my_branch_id()
    )
);

-- 4. POLÍTICAS PARA LOANS
DROP POLICY IF EXISTS "Admin gestiona prestamos" ON public.loans;
DROP POLICY IF EXISTS "Aislamiento Estricto por Dueño - Préstamos" ON public.loans;

CREATE POLICY "Aislamiento Estricto por Sucursal - Préstamos" ON public.loans
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        branch_id::text = public.get_my_branch_id()
        OR collector_id::text = auth.uid()::text
    )
);

-- 5. POLÍTICAS PARA PAYMENTS
DROP POLICY IF EXISTS "Admin gestiona pagos" ON public.payments;
DROP POLICY IF EXISTS "Aislamiento Estricto por Dueño - Pagos" ON public.payments;

CREATE POLICY "Aislamiento Estricto por Sucursal - Pagos" ON public.payments
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        branch_id::text = public.get_my_branch_id()
        OR collector_id::text = auth.uid()::text
    )
);

-- 6. POLÍTICAS PARA COLLECTION_LOGS
DROP POLICY IF EXISTS "Admin gestiona logs" ON public.collection_logs;
DROP POLICY IF EXISTS "Aislamiento Estricto por Dueño - Logs" ON public.collection_logs;

CREATE POLICY "Aislamiento Estricto por Sucursal - Logs" ON public.collection_logs
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        branch_id::text = public.get_my_branch_id()
        OR recorded_by::text = auth.uid()::text
    )
);

-- 7. POLÍTICAS PARA EXPENSES E ISOLATED_EXPENSES
DROP POLICY IF EXISTS "Admin gestiona gastos" ON public.expenses;
DROP POLICY IF EXISTS "Aislamiento Estricto por Sucursal - Gastos" ON public.expenses;

CREATE POLICY "Aislamiento Estricto por Sucursal - Gastos" ON public.expenses
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        branch_id::text = public.get_my_branch_id()
        OR added_by::text = auth.uid()::text
    )
);

-- 8. POLÍTICAS PARA SIMULATED_ORDERS
DROP POLICY IF EXISTS "Aislamiento Estricto por Dueño - Pedidos Simulados" ON public.simulated_orders;

CREATE POLICY "Aislamiento Estricto por Sucursal - Pedidos Simulados" ON public.simulated_orders
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        branch_id::text = public.get_my_branch_id()
        OR collector_id::text = auth.uid()::text
    )
);
