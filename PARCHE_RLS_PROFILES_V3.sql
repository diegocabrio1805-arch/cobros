-- =====================================================================
-- PARCHE RLS DEFINITIVO: Corregir funciones y políticas antiguas
-- Problema: Postgres evalúa TODAS las políticas activas. Si una política 
-- vieja tiene un error de tipos (uuid = text), tumba toda la consulta.
-- =====================================================================

-- 1. CORREGIR LAS FUNCIONES BASE QUE CAUSAN EL ERROR
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id::text = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.get_my_manager()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT managed_by FROM public.profiles WHERE id::text = auth.uid()::text;
$$;


-- 2. ELIMINAR TODAS LAS POLÍTICAS VIEJAS QUE PUEDAN ESTAR CHOCANDO
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Gerente ve su perfil y el de sus cobradores" ON public.profiles;
DROP POLICY IF EXISTS "Cobrador ve su propio perfil y el de su gerente" ON public.profiles;
DROP POLICY IF EXISTS "Cobrador actualiza su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Permitir update a admin y propio perfil" ON public.profiles;

-- 3. CREAR POLÍTICAS LIMPIAS Y SEGURAS (Con casteos correctos)

-- LECTURA (SELECT)
CREATE POLICY "Permitir lectura de perfiles" ON public.profiles FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador' OR
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Gerente' OR
    id::text = auth.uid()::text OR 
    id::text = public.get_my_manager()::text
);

-- ESCRITURA (UPDATE/UPSERT)
CREATE POLICY "Permitir actualizacion de perfiles" ON public.profiles FOR UPDATE USING (
    id::text = auth.uid()::text OR 
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador' OR
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Gerente'
);

-- INSERCIÓN (INSERT) - Necesario para upsert también
CREATE POLICY "Permitir insercion de perfiles" ON public.profiles FOR INSERT WITH CHECK (
    id::text = auth.uid()::text OR 
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador' OR
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Gerente'
);
