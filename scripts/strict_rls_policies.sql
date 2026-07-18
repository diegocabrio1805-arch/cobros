-- ==============================================================================
-- 🛡️ SCRIPT DE SEGURIDAD: OWASP A01 (Strict Row Level Security)
-- ==============================================================================
-- Este script reemplaza las políticas permisivas ("bypasses") con reglas estrictas 
-- de aislamiento de datos (Multi-tenancy) para SistemaANEXO.
-- Asegura que un cobrador/gerente solo vea y modifique los datos que le pertenecen.
-- ==============================================================================

-- 1. Habilitar RLS en las tablas principales
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulated_orders ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar las políticas basura o inseguras previas
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON loans;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON payments;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON collection_logs;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON simulated_orders;

-- 3. Crear Políticas Estrictas de Aislamiento

-- TABLA CLIENTS
-- Regla: Un usuario puede ver/modificar un cliente SI:
-- a) Es un ADMIN general
-- b) El cliente pertenece a su sucursal (branch_id)
CREATE POLICY "Aislamiento Estricto por Sucursal - Clientes" ON clients
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = branch_id 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
    )
);

-- TABLA LOANS
-- Regla: Un usuario puede ver/modificar un préstamo SI:
-- a) Es un ADMIN general
-- b) Es el cobrador asignado (collector_id)
-- c) Es el gerente de la sucursal (branch_id)
CREATE POLICY "Aislamiento Estricto por Dueño - Préstamos" ON loans
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = collector_id 
        OR auth.uid()::text = branch_id 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
    )
);

-- TABLA PAYMENTS
-- Regla: Un usuario puede interactuar con pagos SI:
-- a) Es un ADMIN general
-- b) Registró el pago (collector_id)
-- c) Pertenece a su sucursal (branch_id)
CREATE POLICY "Aislamiento Estricto por Dueño - Pagos" ON payments
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = collector_id 
        OR auth.uid()::text = branch_id 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
    )
);

-- TABLA COLLECTION_LOGS (Auditoría)
CREATE POLICY "Aislamiento Estricto por Dueño - Logs" ON collection_logs
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = recordedBy 
        OR auth.uid()::text = branchId 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
    )
);

-- TABLA SIMULATED_ORDERS
CREATE POLICY "Aislamiento Estricto por Dueño - Pedidos Simulados" ON simulated_orders
FOR ALL USING (
    auth.role() = 'authenticated' AND (
        auth.uid()::text = collectorId 
        OR auth.uid()::text = branchId 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
    )
);
