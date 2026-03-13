-- SEGUNDO PARCHE SQL: PERMITIR ROL ANÓNIMO PARA APP PERSONALIZADA
-- Descubrimos que la app React "Anexo Cobro" usa un Login local y manda queries anónimas a Supabase (usando VITE_SUPABASE_ANON_KEY).
-- Por tanto, la regla auth.role() = 'authenticated' ES INCORRECTA para esta arquitectura.

-- 1. Borramos la política restrictiva que agregamos antes
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON collection_logs;

-- 2. Creamos una política que permita CRUD a través de la clave anónima (app pública pero con login lógico)
CREATE POLICY "Permitir acceso anonimo app frontend" ON collection_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Nota: Como los IDs de sesión están manejados localmente en React, la inserción se confía al cliente.
-- Para `collection_logs` esta política abierta usando `true` soluciona los errores de inserción inmediatamente.
