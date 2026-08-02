-- =====================================================================
-- PARCHE RLS V6: ELIMINACIÓN DE LOS FANTASMAS (Políticas Viejas)
-- =====================================================================

-- ¡AQUÍ ESTABA EL PROBLEMA! Nunca borramos las políticas originales de la Fase 4
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Gerente ve su perfil y el de sus cobradores" ON public.profiles;
DROP POLICY IF EXISTS "Cobrador ve su propio perfil y el de su gerente" ON public.profiles;
DROP POLICY IF EXISTS "Cobrador actualiza su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Permitir update a admin y propio perfil" ON public.profiles;

-- Y dejamos las que creamos en V5 intactas
