-- 1. Eliminar las políticas de actualización restrictivas que puedas tener
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Permitir update a admin y propio perfil" ON public.profiles;

-- 2. Crear una nueva política que permita actualizar si:
--    a) Es el propio usuario (casteando auth.uid() a text por si la columna es de texto)
--    b) El que edita es un ADMIN
--    c) El que edita es un MANAGER
CREATE POLICY "Permitir update a admin y propio perfil" ON public.profiles FOR UPDATE USING (
  id = auth.uid()::text OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'ADMIN' OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'MANAGER'
);
