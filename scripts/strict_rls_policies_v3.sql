-- 1. Habilitar RLS en las tablas principales
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulated_orders ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar las políticas inseguras previas (Bypass)
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.loans;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.collection_logs;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.simulated_orders;

-- 3. Crear Políticas Estrictas de Aislamiento usando compatibilidad de tipos (UUID a TEXT)

-- TABLA CLIENTS
CREATE POLICY "Aislamiento Estricto por Sucursal - Clientes" ON public.clients
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = branch_id::text
        OR (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador'
    )
);

-- TABLA LOANS
CREATE POLICY "Aislamiento Estricto por Dueño - Préstamos" ON public.loans
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = collector_id::text 
        OR auth.uid()::text = branch_id::text 
        OR (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador'
    )
);

-- TABLA PAYMENTS
CREATE POLICY "Aislamiento Estricto por Dueño - Pagos" ON public.payments
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = collector_id::text 
        OR auth.uid()::text = branch_id::text 
        OR (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador'
    )
);

-- TABLA COLLECTION_LOGS (Auditoría)
CREATE POLICY "Aislamiento Estricto por Dueño - Logs" ON public.collection_logs
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = recorded_by::text 
        OR auth.uid()::text = branch_id::text 
        OR (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador'
    )
);

-- TABLA SIMULATED_ORDERS
CREATE POLICY "Aislamiento Estricto por Dueño - Pedidos Simulados" ON public.simulated_orders
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = collector_id::text 
        OR auth.uid()::text = branch_id::text 
        OR (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador'
    )
);
