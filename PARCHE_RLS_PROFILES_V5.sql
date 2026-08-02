-- =====================================================================
-- PARCHE RLS V5: EL PARCHE DEFINITIVO (Evitando Inlining)
-- =====================================================================

-- 1. CORREGIR LAS FUNCIONES A PLPGSQL PARA EVITAR INLINING (Recursión Infinita)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  mi_rol text;
BEGIN
  SELECT role INTO mi_rol FROM public.profiles WHERE id::text = auth.uid()::text;
  RETURN mi_rol;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_manager()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  mi_jefe text;
BEGIN
  SELECT managed_by INTO mi_jefe FROM public.profiles WHERE id::text = auth.uid()::text;
  RETURN mi_jefe;
END;
$$;

-- 2. ELIMINAR LAS POLÍTICAS ANTERIORES
DROP POLICY IF EXISTS "Permitir lectura de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualizacion de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir insercion de perfiles" ON public.profiles;

-- 3. CREAR POLÍTICAS SEGURAS
-- LECTURA (SELECT)
CREATE POLICY "Permitir lectura de perfiles" ON public.profiles FOR SELECT USING (
    id::text = auth.uid()::text OR 
    public.get_my_role() = 'Administrador' OR
    public.get_my_role() = 'Gerente' OR
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
