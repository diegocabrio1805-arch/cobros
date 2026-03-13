require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
// USING SERVICE KEY
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE); // Oops, is it in env? Let's check if the env has service key.
