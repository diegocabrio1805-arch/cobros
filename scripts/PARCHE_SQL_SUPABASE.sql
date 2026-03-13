-- PARCHE CORRECTIVO DE EMERGENCIA: ERROR "texto = uuid" EN LOGS
-- 1. Eliminamos todas las políticas antiguas (sanas o rotas) de la tabla collection_logs
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON collection_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON collection_logs;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON collection_logs;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON collection_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON collection_logs;

-- Eliminación profunda en bloque de cualquier política restante por si acaso
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'collection_logs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON collection_logs', pol.policyname);
    END LOOP;
END
$$;

-- 2. Creamos la ÚNICA política limpia y moderna: "Si tienes inicio de sesión en la app, puedes insertar y leer logs"
CREATE POLICY "Enable all access for authenticated users" ON collection_logs
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Nos aseguramos que la seguridad a nivel de fila siga encendida pero con reglas limpias
ALTER TABLE collection_logs ENABLE ROW LEVEL SECURITY;
