-- FASE 4: ACTIVACIÓN DEL BLINDAJE (RLS) Y REGLAS DE ORO

-- 1. Encender RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_settings ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas viejas (para poder volver a correr el script si es necesario)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. REGLAS DE ORO PARA PERFILES (PROFILES)
-- Admin ve todo. Gerente ve su sucursal. Cobrador se ve a sí mismo y a su gerente.
CREATE POLICY "Admin ve todos los perfiles" ON public.profiles FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'Administrador'
);

CREATE POLICY "Gerente ve perfiles de su sucursal" ON public.profiles FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'Gerente' AND 
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);

CREATE POLICY "Cobrador ve su propio perfil" ON public.profiles FOR SELECT USING (
    id = auth.uid()::text OR id = managed_by
);

-- Cobradores pueden actualizar su propio perfil (ej. última ubicación)
CREATE POLICY "Cobrador actualiza su perfil" ON public.profiles FOR UPDATE USING (
    id = auth.uid()::text
);

-- 4. REGLAS DE ORO GENERALES PARA OPERACION DE SUCURSAL (Para cobradores y gerentes)
-- COMO LOS COBRADORES NECESITAN VER CLIENTES DE LA SUCURSAL PARA BUSCAR Y BUSCAR PRÉSTAMOS
-- Habilitaremos que puedan LEER la info general de su sucursal para que la App no explote.
CREATE POLICY "Gerente ve branch_settings" ON public.branch_settings FOR ALL USING (
    id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);
CREATE POLICY "Cobrador ve branch_settings" ON public.branch_settings FOR SELECT USING (
    id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);

-- REGLAS PARA TABLAS TRANSACCIONALES (clients, loans, payments, expenses, collection_logs)

-- CLIENTS
CREATE POLICY "Gerente gestiona clientes de sucursal" ON public.clients FOR ALL USING (
   (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('Administrador', 'Gerente') AND 
   branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);
CREATE POLICY "Cobrador ve y crea clientes de su sucursal" ON public.clients FOR ALL USING (
   branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);

-- LOANS
CREATE POLICY "Gerente gestiona prestamos" ON public.loans FOR ALL USING (
   (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('Administrador', 'Gerente') AND 
   branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);
CREATE POLICY "Cobrador gestiona prestamos asignados o de su sucursal" ON public.loans FOR ALL USING (
   branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);

-- PAYMENTS
CREATE POLICY "Gerente gestiona pagos" ON public.payments FOR ALL USING (
   (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('Administrador', 'Gerente') AND 
   branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);
CREATE POLICY "Cobrador gestiona sus pagos" ON public.payments FOR ALL USING (
   collector_id = auth.uid()::text OR branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);

-- COLLECTION LOGS
CREATE POLICY "Gerente ve logs sucursal" ON public.collection_logs FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('Administrador', 'Gerente') AND 
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);
CREATE POLICY "Cobrador gestiona sus propios logs" ON public.collection_logs FOR ALL USING (
  recorded_by = auth.uid()::text OR branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);

-- EXPENSES
CREATE POLICY "Gerente gestiona gastos" ON public.expenses FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('Administrador', 'Gerente') AND 
  branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);
CREATE POLICY "Cobrador gestiona sus propios gastos" ON public.expenses FOR ALL USING (
  recorded_by = auth.uid()::text OR branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text)
);
