import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://samgpnczlznynnfhjjff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restore() {
  await supabase.auth.signInWithPassword({ email: 'DDANTE1983@anexocobro.com', password: 'Cobros2026' });

  // 1. Re-insert simulated order into Supabase
  const newOrder = {
    id: '0b2cfe68-842c-42b7-a82a-fa6e3fed0237',
    client_id: '6e767d27-7516-4dc2-8b32-f206509acfbf',
    client_name: 'Z2 - BENICIA ROMERO DE SOSA ',
    principal: 500000,
    interest_rate: 40,
    installments: 35,
    total_amount: 700000,
    installment_value: 20000,
    frequency: 'DIARIA ( L - S )',
    simulation_date: '2026-07-27',
    table_data: [],
    collector_id: 'c956ea2f-99d7-4956-93d5-36842aeb0d54',
    branch_id: 'b3716a78-fb4f-4918-8c0b-92004e3d63ec',
    created_at: '2026-07-25T10:37:00.000Z',
    updated_at: new Date().toISOString()
  };

  console.log("Restoring simulated order for Benicia...");
  const { data, error } = await supabase.from('simulated_orders').upsert(newOrder);
  if (error) console.error("Error restoring order:", error);
  else console.log("Successfully restored order for Benicia!");

  // 2. Remove deletion entry from deleted_items if present
  const { error: delErr } = await supabase
    .from('deleted_items')
    .delete()
    .eq('record_id', '0b2cfe68-842c-42b7-a82a-fa6e3fed0237');
  if (delErr) console.error("Error removing from deleted_items:", delErr);
  else console.log("Removed deletion entry from deleted_items.");
}

restore();
