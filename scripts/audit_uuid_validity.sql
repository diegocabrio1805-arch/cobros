-- ==============================================================================
-- 🚁 DRON DE RECONOCIMIENTO: Auditoría de Integridad de UUIDs (Solo Lectura)
-- ==============================================================================
-- Este script buscará registros infractores que no tengan el formato exacto 
-- de un UUID matemático (36 caracteres, formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
-- Si alguna de estas consultas devuelve filas, DEBES limpiar esos datos antes de migrar.

-- 1. TABLA PROFILES
SELECT id, 'profiles' as tabla, 'id' as columna, id as valor_invalido 
FROM public.profiles 
WHERE id IS NOT NULL AND id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT id, 'profiles' as tabla, 'managed_by' as columna, managed_by as valor_invalido 
FROM public.profiles 
WHERE managed_by IS NOT NULL AND managed_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. TABLA CLIENTS
SELECT id, 'clients' as tabla, 'branch_id' as columna, branch_id as valor_invalido 
FROM public.clients 
WHERE branch_id IS NOT NULL AND branch_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. TABLA LOANS
SELECT id, 'loans' as tabla, 'collector_id' as columna, collector_id as valor_invalido 
FROM public.loans 
WHERE collector_id IS NOT NULL AND collector_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT id, 'loans' as tabla, 'branch_id' as columna, branch_id as valor_invalido 
FROM public.loans 
WHERE branch_id IS NOT NULL AND branch_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. TABLA PAYMENTS
SELECT id, 'payments' as tabla, 'collector_id' as columna, collector_id as valor_invalido 
FROM public.payments 
WHERE collector_id IS NOT NULL AND collector_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT id, 'payments' as tabla, 'branch_id' as columna, branch_id as valor_invalido 
FROM public.payments 
WHERE branch_id IS NOT NULL AND branch_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 5. TABLA COLLECTION_LOGS
SELECT id, 'collection_logs' as tabla, 'recorded_by' as columna, recorded_by as valor_invalido 
FROM public.collection_logs 
WHERE recorded_by IS NOT NULL AND recorded_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT id, 'collection_logs' as tabla, 'branch_id' as columna, branch_id as valor_invalido 
FROM public.collection_logs 
WHERE branch_id IS NOT NULL AND branch_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 6. TABLA SIMULATED_ORDERS
SELECT id, 'simulated_orders' as tabla, 'collector_id' as columna, collector_id as valor_invalido 
FROM public.simulated_orders 
WHERE collector_id IS NOT NULL AND collector_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT id, 'simulated_orders' as tabla, 'branch_id' as columna, branch_id as valor_invalido 
FROM public.simulated_orders 
WHERE branch_id IS NOT NULL AND branch_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
