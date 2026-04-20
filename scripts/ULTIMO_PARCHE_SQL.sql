-- PARCHE FINAL DE LLAVES FORANEAS Y UUID
-- Este parche desvincula `collection_logs` de restricciones strictly-typed (UUID) en el ID o Foráneas que
-- colisionan con la app Web que maneja IDs como "init-xxx" o "admin-1".

-- 1. Destruimos las restricciones foráneas (Foreign Keys) en collection_logs
-- Que evitan guardar un log si su branch_id no está 100% matcheado en tabla perfiles:
ALTER TABLE collection_logs DROP CONSTRAINT IF EXISTS collection_logs_branch_id_fkey;
ALTER TABLE collection_logs DROP CONSTRAINT IF EXISTS collection_logs_client_id_fkey;
ALTER TABLE collection_logs DROP CONSTRAINT IF EXISTS collection_logs_loan_id_fkey;
ALTER TABLE collection_logs DROP CONSTRAINT IF EXISTS collection_logs_recorded_by_fkey;
ALTER TABLE collection_logs DROP CONSTRAINT IF EXISTS collection_logs_recorded_by_fkey1;

-- 2. Nos aseguramos que todos los campos soportan libremente Texto plano sin forzar UUID:
ALTER TABLE collection_logs ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE collection_logs ALTER COLUMN branch_id TYPE text USING branch_id::text;
ALTER TABLE collection_logs ALTER COLUMN client_id TYPE text USING client_id::text;
ALTER TABLE collection_logs ALTER COLUMN loan_id TYPE text USING loan_id::text;
ALTER TABLE collection_logs ALTER COLUMN recorded_by TYPE text USING recorded_by::text;

-- Con esto, la base de datos se vuelve 100% tolerante al formato de IDs que la web está enviando, 
-- y el error silencioso (text = uuid, o violacion de foreign key) se eliminará por completo.
