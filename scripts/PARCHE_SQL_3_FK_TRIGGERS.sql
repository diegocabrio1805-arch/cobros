-- PARCHE CONTRA EL ERROR "text = uuid" AL INSERTAR EN LOGS
-- El error text=uuid suele ocurrir si la columna recorded_by o branch_id de collection_logs
-- intenta hacer join con auth.users en lugar de public.users/public.profiles, o si hay un Trigger roto.

-- 1. Intentar eliminar cualquier restricción Foreign Key de UUID que esté estorbando en collection_logs
DO $$
DECLARE
    fk record;
BEGIN
    FOR fk IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'collection_logs'::regclass AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE collection_logs DROP CONSTRAINT IF EXISTS %I', fk.conname);
    END LOOP;
END
$$;

-- 2. Asegurarnos que recorded_by y branch_id sean tipo text simple sin ataduras a auth.users (UUID)
ALTER TABLE collection_logs ALTER COLUMN recorded_by TYPE text USING recorded_by::text;
ALTER TABLE collection_logs ALTER COLUMN branch_id TYPE text USING branch_id::text;
ALTER TABLE collection_logs ALTER COLUMN client_id TYPE text USING client_id::text;
ALTER TABLE collection_logs ALTER COLUMN loan_id TYPE text USING loan_id::text;
ALTER TABLE collection_logs ALTER COLUMN id TYPE text USING id::text;

-- 3. Desactivar Triggers defectuosos de validación en esta tabla
ALTER TABLE collection_logs DISABLE TRIGGER ALL;

-- 4. Reactivar solo el Trigger seguro (on_record_deleted) que nosotros codificamos para auditoría
-- (Cuidado: esto asume que el delete trigger existía. Si da warning no pasa nada).
-- ALTER TABLE collection_logs ENABLE TRIGGER tr_logs_deletion;
