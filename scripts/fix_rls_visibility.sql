-- 1. Enable RLS on tables (if not already enabled)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies for CLIENTS
-- Allow read/write for authenticated users
CREATE POLICY "Allow all actions for authenticated users" ON clients
FOR ALL USING (auth.role() = 'authenticated');

-- 3. Create Policies for LOANS
CREATE POLICY "Allow all actions for authenticated users" ON loans
FOR ALL USING (auth.role() = 'authenticated');

-- 4. Create Policies for PAYMENTS
CREATE POLICY "Allow all actions for authenticated users" ON payments
FOR ALL USING (auth.role() = 'authenticated');

-- 5. Create Policies for LOGS
CREATE POLICY "Allow all actions for authenticated users" ON collection_logs
FOR ALL USING (auth.role() = 'authenticated');

-- OPTIONAL: If you want to temporarily open EVERYTHING to debug (NOT RECOMMENDED FOR PROD)
-- CREATE POLICY "Allow public access" ON clients FOR ALL USING (true);
