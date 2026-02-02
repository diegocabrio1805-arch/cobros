-- FIX MANAGER/SUPERVISOR PERMISSIONS
-- This script ensures that ANY authenticated user (Admin, Manager, Collector) can INSERT and SELECT 
-- clients, loans, and payments. We move logic to the App layer and trust the authenticated user.

-- 1. CLIENTS
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;

CREATE POLICY "Enable all access for authenticated users" ON clients
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 2. LOANS
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON loans;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON loans;

CREATE POLICY "Enable all access for authenticated users" ON loans
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 3. PAYMENTS
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payments;

CREATE POLICY "Enable all access for authenticated users" ON payments
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. LOGS
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON collection_logs;

CREATE POLICY "Enable all access for authenticated users" ON collection_logs
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5. USERS (Critical for Login/Sync checks)
CREATE POLICY "Enable read access for authenticated users" ON users
    FOR SELECT
    USING (auth.role() = 'authenticated');
