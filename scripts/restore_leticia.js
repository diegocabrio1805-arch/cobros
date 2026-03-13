
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oppcyderpkhcnduqexag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcGN5ZGVycGtoY25kdXFleGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTI4MTAsImV4cCI6MjA4NDE4ODgxMH0.1HTcC027RlcyOPn_BT4xoVw9PDibm_S8A03DQ5IEzaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Buscando usuario 'leticiajavi'...");

    // 1. Encuentra el usuario
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', '%leticia%');

    if (userError) {
        console.error("Error buscando usuario:", userError);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No se encontró usuario con 'leticia' en el nombre de usuario.");
        return;
    }

    const targetUser = users[0];
    console.log(`Usuario encontrado: ${targetUser.name} (${targetUser.username}) - ID: ${targetUser.id}`);

    // 2. Busca clientes asociados (ocultos o inactivos)
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, name, is_hidden, is_active')
        .or(`added_by.eq.${targetUser.id},branch_id.eq.${targetUser.id}`);

    if (clientError) {
        console.error("Error buscando clientes:", clientError);
        return;
    }

    console.log(`Encontrados ${clients.length} clientes asociados.`);

    const hiddenClients = clients.filter(c => c.is_hidden || !c.is_active);
    console.log(`Clientes para restaurar (ocultos/inactivos): ${hiddenClients.length}`);

    if (hiddenClients.length > 0) {
        const ids = hiddenClients.map(c => c.id);
        const { error: updateError } = await supabase
            .from('clients')
            .update({ is_hidden: false, is_active: true })
            .in('id', ids);

        if (updateError) {
            console.error("Error restaurando clientes:", updateError);
        } else {
            console.log("¡Clientes restaurados correctamente!");
            hiddenClients.forEach(c => console.log(`- ${c.name}`));
        }
    } else {
        console.log("Todos los clientes ya están visibles y activos.");
        // Opcional: Mostrar algunos nombres para confirmar
        clients.slice(0, 5).forEach(c => console.log(`- Visible: ${c.name}`));
    }
}

main();
