import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkCounts() {
    console.log("Checking row counts in Supabase...");

    const check = async (table) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`Table ${table} -> ${count} rows`);
    };

    await check('payments');
    await check('collection_logs');
    await check('clients');
    await check('loans');
    await check('expenses');
    await check('deleted_items');
}

checkCounts();
