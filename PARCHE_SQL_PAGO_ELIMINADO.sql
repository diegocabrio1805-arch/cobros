-- Este parche elimina cualquier restricción que impida guardar el tipo "PAGO_ELIMINADO" en collection_logs

DO $$ 
DECLARE
  constraint_name text;
BEGIN
  -- Buscar si hay un CHECK constraint (restricción) en la columna 'type'
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
  JOIN pg_class cls ON cls.oid = con.conrelid
  WHERE cls.relname = 'collection_logs' 
    AND att.attname = 'type' 
    AND con.contype = 'c';

  IF constraint_name IS NOT NULL THEN
    -- Si existe una regla estricta que impide "PAGO_ELIMINADO", la quitamos
    EXECUTE 'ALTER TABLE public.collection_logs DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;
