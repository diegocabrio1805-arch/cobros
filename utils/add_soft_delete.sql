/*
  AGREGAR SOPORTE PARA "SOFT DELETE" (ELIMINACIÓN SUAVE)
  
  Esta estrategia es más robusta para la sincronización. En lugar de borrar el registro físicamente,
  lo marcamos como eliminado usando la columna 'deleted_at'.
*/

-- 1. Agregar columna deleted_at a PAYMENTS
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Agregar columna deleted_at a LOANS
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Agregar columna deleted_at a COLLECTION_LOGS
ALTER TABLE public.collection_logs 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Agregar columna deleted_at a CLIENTS
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
