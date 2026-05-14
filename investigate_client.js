import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log(`Checking database...`);
  
  const { count: clientCount, error: clientError } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  if (clientError) {
    console.error('Error fetching clients:', clientError);
    return;
  }

  console.log(`Total clients: ${clientCount}`);
  
  const { data: recentClients } = await supabase
    .from('clients')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: users } = await supabase
    .from('profiles')
    .select('id, name');

  const result = {
    clientCount,
    recentClients,
    users
  };

  const outputPath = path.join(__dirname, 'client_investigation.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Investigation results saved to ${outputPath}`);
}

check();
