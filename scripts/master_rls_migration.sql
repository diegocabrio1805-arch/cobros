-- ==============================================================================
-- 🚀 MASTER SCRIPT: MIGRACIÓN + SEGURIDAD RLS (VERSIÓN DEFINITIVA)
-- ==============================================================================

-- 1. ELIMINAR POLÍTICAS VIEJAS
-- Borramos las políticas de las tablas transaccionales para que PostgreSQL nos deje modificarlas.
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.loans;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.collection_logs;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.simulated_orders;

-- 2. MIGRACIÓN A UUID (Excluyendo 'profiles' para no romper tus configuraciones viejas)
ALTER TABLE public.clients ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

ALTER TABLE public.loans 
  ALTER COLUMN collector_id TYPE uuid USING collector_id::uuid, 
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

ALTER TABLE public.payments 
  ALTER COLUMN collector_id TYPE uuid USING collector_id::uuid, 
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

ALTER TABLE public.collection_logs 
  ALTER COLUMN recorded_by TYPE uuid USING recorded_by::uuid, 
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

ALTER TABLE public.simulated_orders 
  ALTER COLUMN collector_id TYPE uuid USING collector_id::uuid, 
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

-- 3. ACTIVAR SEGURIDAD RLS EN LAS TABLAS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulated_orders ENABLE ROW LEVEL SECURITY;

-- 4. CREAR POLÍTICAS DE AISLAMIENTO ESTRICTO (UUID NATIVO)
-- Nota: Usamos auth.uid()::text solo en la subconsulta de profiles porque decidimos no migrar esa tabla.

CREATE POLICY "Aislamiento Estricto por Sucursal - Clientes" ON public.clients
FOR ALL USING (auth.role() = 'authenticated' AND (auth.uid() = branch_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'Administrador'));

CREATE POLICY "Aislamiento Estricto por Dueño - Préstamos" ON public.loans
FOR ALL USING (auth.role() = 'authenticated' AND (auth.uid() = collector_id OR auth.uid() = branch_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'Administrador'));

CREATE POLICY "Aislamiento Estricto por Dueño - Pagos" ON public.payments
FOR ALL USING (auth.role() = 'authenticated' AND (auth.uid() = collector_id OR auth.uid() = branch_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'Administrador'));

CREATE POLICY "Aislamiento Estricto por Dueño - Logs" ON public.collection_logs
FOR ALL USING (auth.role() = 'authenticated' AND (auth.uid() = recorded_by OR auth.uid() = branch_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'Administrador'));

CREATE POLICY "Aislamiento Estricto por Dueño - Pedidos Simulados" ON public.simulated_orders
FOR ALL USING (auth.role() = 'authenticated' AND (auth.uid() = collector_id OR auth.uid() = branch_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'Administrador'));
