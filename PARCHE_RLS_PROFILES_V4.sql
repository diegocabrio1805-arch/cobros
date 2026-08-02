-- =====================================================================
-- PARCHE RLS V4: SOLUCIÓN A RECURSIÓN INFINITA (Error 500)
-- =====================================================================

-- 1. Asegurar que las funciones Security Definer estén bien (ya lo hicimos, pero por si acaso)
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

-- 2. Eliminar TODAS las políticas que pudimos haber creado
DROP POLICY IF EXISTS "Permitir lectura de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualizacion de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir insercion de perfiles" ON public.profiles;

-- 3. Crear las políticas usando LAS FUNCIONES (esto evita la recursión infinita)
-- LECTURA (SELECT)
CREATE POLICY "Permitir lectura de perfiles" ON public.profiles FOR SELECT USING (
    public.get_my_role() = 'Administrador' OR
    public.get_my_role() = 'Gerente' OR
    id::text = auth.uid()::text OR 
    id::text = public.get_my_manager()
);

-- ESCRITURA (UPDATE)
CREATE POLICY "Permitir actualizacion de perfiles" ON public.profiles FOR UPDATE USING (
    id::text = auth.uid()::text OR 
    public.get_my_role() = 'Administrador' OR
    public.get_my_role() = 'Gerente'
);

-- INSERCIÓN (INSERT)
CREATE POLICY "Permitir insercion de perfiles" ON public.profiles FOR INSERT WITH CHECK (
    id::text = auth.uid()::text OR 
    public.get_my_role() = 'Administrador' OR
    public.get_my_role() = 'Gerente'
);
