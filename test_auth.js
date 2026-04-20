
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oppcyderpkhcnduqexag.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
    console.log("Probando login para: ddante1983@anexocobro.com");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'ddante1983@anexocobro.com',
        password: '9876543210'
    });

    if (error) {
        console.error("ERROR DE LOGIN:", error.message);
        console.error("DETALLES:", error);
    } else {
        console.log("LOGIN EXITOSO!");
        console.log("User ID:", data.user.id);
    }
}

testLogin();
