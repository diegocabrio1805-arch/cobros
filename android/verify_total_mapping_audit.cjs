const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const lines = envLocal.split('\n');
let supabaseUrl = '';
let supabaseKeyAnon = '';

for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKeyAnon = line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKeyAnon);

async function verifyTotalMapping() {
    console.log("=== AUDITORÍA DE MAPEO TOTAL (PUSH & PULL) ===");

    // Test Data
    const testId = "test-mapping-" + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    // 1. LOGIN
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'alterfin@anexocobro.com',
        password: '20252026'
    });
    if (authError) { console.error("❌ Auth error:", authError.message); return; }
    console.log("✅ Autenticado como Gerente");

    // 2. CLIENT MAPPING TEST
    console.log("\n--- Probando Clientes ---");
    const clientPayload = {
        id: testId,
        name: "TEST CLIENT MAP",
        document_id: "DOC123",
        credit_limit: 5000,
        allow_collector_location_update: true,
        is_active: true,
        updated_at: now
    };

    const { error: clientError } = await supabase.from('clients').upsert([clientPayload]);
    if (clientError) console.error("❌ Error Upsert Cliente:", clientError.message);
    else {
        const { data: clientPull } = await supabase.from('clients').select('*').eq('id', testId).single();
        // Emular mapeo App.tsx
        const mapped = {
            ...clientPull,
            creditLimit: clientPull.credit_limit,
            allowCollectorLocationUpdate: clientPull.allow_collector_location_update,
            isActive: clientPull.is_active
        };
        if (mapped.creditLimit === 5000 && mapped.isActive === true) console.log("✅ Mapeo de Clientes OK");
        else console.error("❌ Error Mapeo Clientes:", mapped);
    }

    // 3. LOAN MAPPING TEST
    console.log("\n--- Probando Préstamos ---");
    const loanId = "loan-" + testId;
    const loanPayload = {
        id: loanId,
        client_id: testId,
        principal: 1000,
        interest_rate: 10,
        is_renewal: true,
        custom_holidays: ["2026-05-01"],
        updated_at: now
    };
    const { error: loanError } = await supabase.from('loans').upsert([loanPayload]);
    if (loanError) console.error("❌ Error Upsert Préstamo:", loanError.message);
    else {
        const { data: loanPull } = await supabase.from('loans').select('*').eq('id', loanId).single();
        // Emular mapeo App.tsx
        const mapped = {
            ...loanPull,
            interestRate: loanPull.interest_rate,
            isRenewal: loanPull.is_renewal,
            customHolidays: loanPull.custom_holidays
        };
        if (mapped.interestRate === 10 && mapped.isRenewal === true && mapped.customHolidays[0] === "2026-05-01") console.log("✅ Mapeo de Préstamos OK");
        else console.error("❌ Error Mapeo Préstamos:", mapped);
    }

    // 4. SOFT DELETE TEST
    console.log("\n--- Probando Borrado Suave ---");
    const deletePayload = { id: testId, deleted_at: now };
    const { error: deleteError } = await supabase.from('clients').upsert([deletePayload]);
    if (deleteError) console.error("❌ Error Borrado Suave:", deleteError.message);
    else {
        const { data: deletePull } = await supabase.from('clients').select('deleted_at').eq('id', testId).single();
        if (deletePull.deleted_at) console.log("✅ Borrado Suave (deleted_at) OK");
        else console.error("❌ Error deleted_at no se guardó");
    }

    console.log("\n=== AUDITORÍA COMPLETADA SIN MODIFICAR LÓGICA ===");
}

verifyTotalMapping();
