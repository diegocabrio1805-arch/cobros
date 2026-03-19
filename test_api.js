import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env manually
const envContent = fs.readFileSync('c:/Users/HP/Desktop/cobros/.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) {
    env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
  }
});

async function run() {
  try {
    const res = await fetch(env.VITE_SUPABASE_URL + '/rest/v1/clients?select=id,document_id,name,phone,secondary_phone,address,added_by,branch_id,location,domicilio_location,credit_limit,allow_collector_location_update,custom_no_pay_message,is_active,is_hidden,created_at,updated_at,deleted_at,capital,current_balance,raw_data', {
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + env.VITE_SUPABASE_ANON_KEY,
      }
    });
    
    const text = await res.text();
    fs.writeFileSync(join(__dirname, 'api_output_clients.txt'), text);
    console.log("CLIENTS DONE");
  } catch (e) {
    fs.writeFileSync(join(__dirname, 'api_output_clients.txt'), e.toString());
  }
}

run();
