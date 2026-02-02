
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Checking user 'FABIAN'...");

    // Check if exists
    const { data: existing, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .or('username.ilike.FABIAN,username.ilike.FABIAN ARRUA');

    if (findError) {
        console.error("Error finding user:", findError);
        return;
    }

    if (existing && existing.length > 0) {
        const user = existing[0];
        console.log("User FABIAN found:", user);

        // Update password and unblock
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                password: 'dev', // Setting simple password
                blocked: false,
                name: 'FABIAN ARRUA' // Ensure full name is correct
            })
            .eq('id', user.id);

        if (updateError) {
            console.error("Error updating FABIAN:", updateError);
        } else {
            console.log("SUCCESS: User 'FABIAN' updated. Password set to 'dev'. Account Unblocked.");
        }
    } else {
        console.log("User FABIAN not found. Creating...");

        // Ensure we have an admin or manager to manage this user
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'Admin').limit(1);
        const managerId = admins?.[0]?.id || null;

        const newUser = {
            id: crypto.randomUUID(),
            name: 'FABIAN ARRUA',
            username: 'FABIAN',
            password: 'dev',
            role: 'Cobrador',
            blocked: false,
            managed_by: managerId
        };

        const { error: createError } = await supabase.from('profiles').insert(newUser);

        if (createError) {
            console.error("Error creating FABIAN:", createError);
        } else {
            console.log("SUCCESS: User 'FABIAN' created with password 'dev'.");
        }
    }
}

main();
