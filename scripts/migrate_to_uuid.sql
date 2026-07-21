-- ==============================================================================
-- 🛠️ SCRIPT DE MIGRACIÓN CORREGIDO: TEXT a NATIVO UUID (Performance Boost)
-- ==============================================================================
-- Ejecutar ESTE script primero para preparar las tablas antes de las políticas RLS.

-- 1. MIGRACIÓN TABLA PROFILES
ALTER TABLE public.profiles 
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN managed_by TYPE uuid USING managed_by::uuid;

-- 2. MIGRACIÓN TABLA CLIENTS
ALTER TABLE public.clients 
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

-- 3. MIGRACIÓN TABLA LOANS
ALTER TABLE public.loans 
  ALTER COLUMN collector_id TYPE uuid USING collector_id::uuid,
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;
  
-- Opcional (si lo vas a usar): ALTER COLUMN client_id TYPE uuid USING client_id::uuid;

-- 4. MIGRACIÓN TABLA PAYMENTS
ALTER TABLE public.payments 
  ALTER COLUMN collector_id TYPE uuid USING collector_id::uuid,
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

-- 5. MIGRACIÓN TABLA COLLECTION_LOGS
ALTER TABLE public.collection_logs 
  ALTER COLUMN recorded_by TYPE uuid USING recorded_by::uuid,
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

-- 6. MIGRACIÓN TABLA SIMULATED_ORDERS
ALTER TABLE public.simulated_orders 
  ALTER COLUMN collector_id TYPE uuid USING collector_id::uuid,
  ALTER COLUMN branch_id TYPE uuid USING branch_id::uuid;

-- ==============================================================================
-- ✅ ¡Listo! Una vez que este script se ejecute con "Success", 
-- la base de datos será de Grado Enterprise. 
-- Ahora podrás ejecutar el Script de RLS (strict_rls_policies_final.sql)
-- sin que te dé el error de "uuid = text".
-- ==============================================================================
