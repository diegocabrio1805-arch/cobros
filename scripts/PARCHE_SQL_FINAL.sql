-- PARCHE DEFINITIVO: ERROR "text = uuid" AL INSERTAR EN LOGS
-- Descubrimos que la columna `id` de `collection_logs` está causando el crash 
-- porque se esperaba que fuera UUID por defecto, pero la App React envía IDs como 'init-xxxx' o 'test-log' (Textos puros).

-- 1. Cambiamos el tipo de dato de Primary Key respetuosamente
ALTER TABLE collection_logs ALTER COLUMN id TYPE text USING id::text;

-- 2. Limpiar el default_value que probablemente fuerce a usar gen_random_uuid()
ALTER TABLE collection_logs ALTER COLUMN id DROP DEFAULT;
