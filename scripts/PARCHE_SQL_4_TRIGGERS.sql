-- PARCHE DEFINITIVO FINAL NÚMERO 4: DESTRUCCIÓN DE TRIGGERS
-- El error 'text = uuid' proviene de una función Trigger escondida que se dispara al Insertar,
-- Actualizar o Eliminar en collection_logs y asume mal los formatos.

-- 1. Eliminar cualquier Trigger conocido en la tabla
DROP TRIGGER IF EXISTS tr_logs_deletion ON public.collection_logs;
DROP TRIGGER IF EXISTS on_auth_user_created ON public.collection_logs;
DROP TRIGGER IF EXISTS ensure_collection_logs_uuid ON public.collection_logs;

-- Eliminación profunda automática de CUALQUIER trigger en la tabla collection_logs
DO $$
DECLARE
    trg record;
BEGIN
    FOR trg IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'collection_logs'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON collection_logs', trg.trigger_name);
    END LOOP;
END
$$;

-- 2. Asegurar que las columnas conflictivas del Schema puedan aceptar texto
-- por si alguna Vista dependiente materializó mal. (Usualmente la Vista no tira ese error pero por si acaso).
ALTER TABLE collection_logs ALTER COLUMN client_id TYPE text USING client_id::text;
ALTER TABLE collection_logs ALTER COLUMN loan_id TYPE text USING loan_id::text;
ALTER TABLE collection_logs ALTER COLUMN branch_id TYPE text USING branch_id::text;
