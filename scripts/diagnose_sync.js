
import { createClient } from '@supabase/supabase-js';

// Using the CORRECT credentials (oppcy...)
const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testTable(tableName) {
    console.log(`Testing table: '${tableName}'...`);
    try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        if (error) {
            console.error(`[FAIL] Table '${tableName}' error:`, error.message, error.details || '');
            return false;
        } else {
            console.log(`[PASS] Table '${tableName}' OK. Found ${data.length} rows (limit 1).`);
            return true;
        }
    } catch (e) {
        console.error(`[CRITICAL] Exception testing '${tableName}':`, e);
        return false;
    }
}

async function main() {
    console.log("--- STARTING SYNC DIAGNOSIS ---");
    console.log("Target URL:", SUPABASE_URL);

    // List of tables used in useSync.ts
    const tables = [
        'clients',
        'loans',
        'payments',
        'collection_logs',
        'profiles',
        'branch_settings'
    ];

    let allPass = true;
    for (const t of tables) {
        const pass = await testTable(t);
        if (!pass) allPass = false;
    }

    if (allPass) {
        console.log("\n--- DIAGNOSIS: ALL TABLES ACCESSIBLE ---");
        console.log("If the app still fails, check:");
        console.log("1. RLS Policies (maybe 'anon' can read 1 row but 'authenticated' user cannot?)");
        console.log("2. Data Mapping errors (JS side).");
    } else {
        console.log("\n--- DIAGNOSIS: FAILURES DETECTED ---");
        console.log("Fix the errors above (likely missing table or RLS policy blocking access).");
    }
}

main();
