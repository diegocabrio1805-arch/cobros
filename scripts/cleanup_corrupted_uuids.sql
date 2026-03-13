-- Complete Database Cleanup: Remove All Corrupted UUIDs
-- CORRECT ORDER - Respecting foreign key constraints

-- Step 1: See what corrupted records we have
SELECT 'CORRUPTED PROFILES' as type, id::text, name, username, role
FROM profiles
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%';

-- Step 2: DELETE IN CORRECT ORDER (children first, then parents)

-- 2.1: Delete ALL collection_logs with corrupted IDs
DELETE FROM collection_logs
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%';

-- 2.2: Delete collection_logs that reference corrupted loan_ids
DELETE FROM collection_logs
WHERE loan_id IS NOT NULL 
  AND LENGTH(loan_id::text) != 36;

-- 2.3: Delete collection_logs that reference corrupted client_ids
DELETE FROM collection_logs
WHERE client_id IS NOT NULL 
  AND LENGTH(client_id::text) != 36;

-- 2.4: Delete collection_logs that reference corrupted recorded_by (user ids)
DELETE FROM collection_logs
WHERE recorded_by IS NOT NULL 
  AND LENGTH(recorded_by::text) != 36;

-- Step 3: Delete corrupted loans
DELETE FROM loans
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%';

-- Step 4: Delete corrupted clients
DELETE FROM clients
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%';

-- Step 5: Delete corrupted profiles (LAST, after all references are gone)
DELETE FROM profiles
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%';

-- Verification: Check if any corrupted UUIDs remain
SELECT 'REMAINING CORRUPTED PROFILES' as check_type, COUNT(*) as count
FROM profiles
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%'
UNION ALL
SELECT 'REMAINING CORRUPTED CLIENTS', COUNT(*)
FROM clients
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%'
UNION ALL
SELECT 'REMAINING CORRUPTED LOANS', COUNT(*)
FROM loans
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%'
UNION ALL
SELECT 'REMAINING CORRUPTED COLLECTION_LOGS', COUNT(*)
FROM collection_logs
WHERE LENGTH(id::text) != 36 OR id::text NOT LIKE '%-%-%-%-%';
