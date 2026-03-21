import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function assignDiegoToLeticia() {
    console.log("Asignando cobrador diegoescribano a la gerente leticiaabogada...");

    const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ branch_id: '93e73104-7ce8-453b-b0a3-b574b69a744c' })
        .eq('id', '558ce035-e158-42d8-b18e-9649a7f5c52b'); // ID of Diego Escribano

    if (updateError) {
         console.error("Error al actualizar perfil de Diego:", updateError);
    } else {
         console.log("¡Diego asignado a Leticia correctamente!");
    }
}

assignDiegoToLeticia();
