import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://samgpnczlznynnfhjjff.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE'
);

const BRANCH_ID = '7d86eec9-7864-452d-bd21-964109fa423b';
const LOAN_ID = 'ac5007b0-ba12-403f-82d9-c6d447d1f5c0';
const CLIENT_ID = '05b85501-d030-4728-8ad4-aed695e66a82';

// 1. Ver todos los perfiles de esa sucursal sin filtros (usar admin login)
const { error: loginErr } = await supabase.auth.signInWithPassword({
  email: 'cabriodiego@gmail.com',
  password: 'Cobros2026'
});
console.log('Login admin:', loginErr ? loginErr.message : 'OK');

// Ver todos los perfiles de la sucursal
const { data: profiles, error: profErr } = await supabase
  .from('profiles')
  .select('id, full_name, username, role, branch_id')
  .eq('branch_id', BRANCH_ID);

console.log('\nPerfiles de la sucursal BRASIL:', JSON.stringify(profiles, null, 2));
console.log('Error:', profErr);

// Buscar el cobrador COBRACOOLBR específicamente
const { data: cobrador, error: cobErr } = await supabase
  .from('profiles')
  .select('id, full_name, username, role, branch_id')
  .ilike('username', '%cobracool%');

console.log('\nCobrador COBRACOOLBR:', JSON.stringify(cobrador, null, 2));
