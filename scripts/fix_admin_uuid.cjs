const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixAdmin() {
    console.log("--- Fixing Admin UUID ---");

    // 1. Rename old admin
    console.log("1. Renaming old admin-1...");
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: '123456_legacy' })
        .eq('id', 'admin-1');

    if (updateError) console.error("Update error:", updateError);
    else console.log("Old admin renamed.");

    // 2. Create new admin with UUID
    const newId = randomUUID();
    console.log(`2. Creating new admin with UUID: ${newId}...`);

    const { error: insertError } = await supabase
        .from('profiles')
        .insert({
            id: newId,
            username: '123456',
            password: '123456', // Assuming this is the password from context
            role: 'Administrador',
            name: 'Administrador',
            blocked: false
        });

    if (insertError) {
        console.error("Insert error:", insertError);
    } else {
        console.log("SUCCESS: New admin created.");
    }
}

fixAdmin();
