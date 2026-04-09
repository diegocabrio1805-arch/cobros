import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("No se encontraron las variables de entorno de Supabase.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Verificando existencia de logs de tipo PAGO_ELIMINADO...");
  
  const { data, error } = await supabase
    .from('collection_logs')
    .select('id, type')
    .eq('type', 'PAGO_ELIMINADO')
    .limit(1);

  if (error) {
    console.error("Error al consultar:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("¡VERIFICADO! Ya existen registros con type='PAGO_ELIMINADO' en la base de datos.");
    console.log("Esto confirma que la restricción ya no existe o que el parche ya se había aplicado.");
  } else {
    console.log("No se encontraron registros de este tipo aún. Intentaremos una inserción en seco (simulada) si fuera posible, pero respetando tu orden de 'no hacer nada'.");
  }
}

check();
