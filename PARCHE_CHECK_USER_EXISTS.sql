-- =====================================================================
-- PARCHE: Función para verificar si un usuario existe (Login)
-- =====================================================================

-- Esta función permite verificar de forma segura si un username existe 
-- en la tabla perfiles, incluso antes de iniciar sesión (anon).
CREATE OR REPLACE FUNCTION public.check_user_exists(p_username TEXT)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = p_username);
$$;

-- Permitimos que usuarios no autenticados (pantalla de login) puedan ejecutarla
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO authenticated;
