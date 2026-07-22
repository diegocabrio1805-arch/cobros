-- ==============================================================================
-- 📊 MIGRACIÓN: EVOLUCIÓN DE ESQUEMA PARA DATOS DE MIGRACIÓN HISTÓRICA
-- ==============================================================================

BEGIN;

-- 1. Agregar columnas semánticas con valores por defecto para producción activa
ALTER TABLE public.collection_logs 
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'APP_MOBILE',
  ADD COLUMN IF NOT EXISTS is_migration BOOLEAN DEFAULT FALSE;

-- 2. Backfill: Etiquetar retroactivamente los registros importados de Excel
UPDATE public.collection_logs
SET 
  source = 'EXCEL_MIGRATION',
  is_migration = TRUE
WHERE id LIKE 'LOG-MIG-L-%';

-- 3. Crear índice B-Tree para acelerar los filtros
CREATE INDEX IF NOT EXISTS idx_collection_logs_migration 
ON public.collection_logs (is_migration) 
WHERE is_migration = TRUE;

COMMIT;
