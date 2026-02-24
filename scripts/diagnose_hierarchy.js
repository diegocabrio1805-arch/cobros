
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    const { data: users } = await supabase.from('profiles').select('id, name, username, role, branch_id, managed_by');
    console.log("=== DIAGNÓSTICO DE JERARQUÍA ===");
    users.forEach(u => {
        console.log(`[${u.role}] - ${u.name} (ID: ${u.id})`);
        console.log(`   Branch: ${u.branch_id} | ManagedBy: ${u.managed_by}\n`);
    });
}

diagnose();
