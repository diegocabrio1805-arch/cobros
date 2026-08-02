-- 1. Eliminar la política anterior que causó el error de UUID
DROP POLICY IF EXISTS "Permitir update a admin y propio perfil" ON public.profiles;

-- 2. Crear la política correcta. 
-- Es VITAL usar "id::text" para evitar el error "operator does not exist: uuid = text".
-- Además, los roles en la base de datos se guardan como 'Administrador' y 'Gerente' en español.
CREATE POLICY "Permitir update a admin y propio perfil" ON public.profiles FOR UPDATE USING (
  id::text = auth.uid()::text OR 
  (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Administrador' OR
  (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) = 'Gerente'
);
