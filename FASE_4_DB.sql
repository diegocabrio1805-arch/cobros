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

-- 3. FUNCIONES DE AYUDA (SECURITY DEFINER)
-- Creamos estas funciones para evitar el error de "Recursión Infinita" (Infinite Recursion) 
-- cuando una política de RLS intenta leer de la misma tabla que está protegiendo.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.get_my_manager()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT managed_by FROM public.profiles WHERE id = auth.uid()::text;
$$;


-- 4. REGLAS DE ORO PARA PERFILES (PROFILES)
-- Admin ve todo. Gerente ve su perfil y el de sus cobradores. Cobrador se ve a sí mismo y a su gerente.
CREATE POLICY "Admin ve todos los perfiles" ON public.profiles FOR ALL USING (
    public.get_my_role() = 'Administrador'
);
CREATE POLICY "Gerente ve su perfil y el de sus cobradores" ON public.profiles FOR ALL USING (
    public.get_my_role() = 'Gerente' AND 
    (id = auth.uid()::text OR managed_by = auth.uid()::text)
);
CREATE POLICY "Cobrador ve su propio perfil y el de su gerente" ON public.profiles FOR SELECT USING (
    id = auth.uid()::text OR id = public.get_my_manager()
);
CREATE POLICY "Cobrador actualiza su perfil" ON public.profiles FOR UPDATE USING (
    id = auth.uid()::text
);

-- 5. REGLAS DE ORO GENERALES PARA OPERACION DE SUCURSAL
CREATE POLICY "Admin ve branch_settings" ON public.branch_settings FOR ALL USING (
    public.get_my_role() = 'Administrador'
);
CREATE POLICY "Gerente ve branch_settings" ON public.branch_settings FOR ALL USING (
    id = auth.uid()::text
);
CREATE POLICY "Cobrador ve branch_settings" ON public.branch_settings FOR SELECT USING (
    id = public.get_my_manager()
);

-- 6. REGLAS PARA TABLAS TRANSACCIONALES
-- CLIENTS
CREATE POLICY "Admin gestiona clientes" ON public.clients FOR ALL USING (
   public.get_my_role() = 'Administrador'
);
CREATE POLICY "Gerente gestiona clientes de sucursal" ON public.clients FOR ALL USING (
   public.get_my_role() = 'Gerente' AND branch_id = auth.uid()::text
);
CREATE POLICY "Cobrador ve y crea clientes de su sucursal" ON public.clients FOR ALL USING (
   branch_id = public.get_my_manager()
);

-- LOANS
CREATE POLICY "Admin gestiona prestamos" ON public.loans FOR ALL USING (
   public.get_my_role() = 'Administrador'
);
CREATE POLICY "Gerente gestiona prestamos" ON public.loans FOR ALL USING (
   public.get_my_role() = 'Gerente' AND branch_id = auth.uid()::text
);
CREATE POLICY "Cobrador gestiona prestamos asignados o de su sucursal" ON public.loans FOR ALL USING (
   branch_id = public.get_my_manager()
);

-- PAYMENTS
CREATE POLICY "Admin gestiona pagos" ON public.payments FOR ALL USING (
   public.get_my_role() = 'Administrador'
);
CREATE POLICY "Gerente gestiona pagos" ON public.payments FOR ALL USING (
   public.get_my_role() = 'Gerente' AND branch_id = auth.uid()::text
);
CREATE POLICY "Cobrador gestiona sus pagos" ON public.payments FOR ALL USING (
   branch_id = public.get_my_manager()
);

-- COLLECTION LOGS
CREATE POLICY "Admin gestiona logs" ON public.collection_logs FOR ALL USING (
  public.get_my_role() = 'Administrador'
);
CREATE POLICY "Gerente ve logs sucursal" ON public.collection_logs FOR ALL USING (
  public.get_my_role() = 'Gerente' AND branch_id = auth.uid()::text
);
CREATE POLICY "Cobrador gestiona sus propios logs" ON public.collection_logs FOR ALL USING (
  recorded_by = auth.uid()::text OR branch_id = public.get_my_manager()
);

-- EXPENSES
CREATE POLICY "Admin gestiona gastos" ON public.expenses FOR ALL USING (
  public.get_my_role() = 'Administrador'
);
CREATE POLICY "Gerente gestiona gastos" ON public.expenses FOR ALL USING (
  public.get_my_role() = 'Gerente' AND branch_id = auth.uid()::text
);
CREATE POLICY "Cobrador gestiona sus propios gastos" ON public.expenses FOR ALL USING (
  added_by = auth.uid()::text OR branch_id = public.get_my_manager()
);
