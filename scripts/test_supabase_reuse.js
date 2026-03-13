import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testQueryReuse() {
    let query = supabase.from('clients').select('id');
    console.log("Fetching page 0...");
    let res1 = await query.range(0, 5);
    console.log("Page 0:", res1.data?.length, res1.error);

    console.log("Fetching page 1...");
    let res2 = await query.range(6, 11);
    console.log("Page 1:", res2.data?.length, res2.error);
}

testQueryReuse();
