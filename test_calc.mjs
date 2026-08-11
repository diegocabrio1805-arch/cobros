import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://samgpnczlznynnfhjjff.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'ALTERFINADMI@anexocobro.com',
    password: '123456'
  });
  
  const loanId = 'L-96aa26b3-4fdc-4bb2-881c-9db0f8eb9f29';
  const { data: logs } = await supabase.from('collection_logs').select('*').eq('loan_id', loanId);
  const { data: loan } = await supabase.from('loans').select('*').eq('id', loanId).single();
  
  const validLogs = logs.filter(log => {
    const logType = String(log.type || '').toUpperCase();
    const isOpening = log.isOpening || log.is_opening || false;
    const isDeleted = log.deletedAt || log.deleted_at;
    if (isDeleted) return false;
    if (!(logType === 'PAGO' || logType === 'PAYMENT')) return false;
    if (isOpening) return false;
    return true;
  });

  const seenMigs = new Set();
  const migLogs = validLogs.filter(l => String(l.id || '').startsWith('LOG-MIG-'));
  migLogs.sort((a, b) => {
      const aTime = new Date(a.updated_at || a.updatedAt || a.date).getTime();
      const bTime = new Date(b.updated_at || b.updatedAt || b.date).getTime();
      return bTime - aTime;
  });
  const latestMigLog = migLogs.length > 0 ? migLogs[0] : null;
  const migDateStr = latestMigLog ? new Date(latestMigLog.updated_at || latestMigLog.updatedAt || latestMigLog.date).toISOString() : null;

  console.log("MigDateStr:", migDateStr);

  const totalFromLogs = validLogs.reduce((acc, log) => {
    const id = String(log.id || '');
    if (id.startsWith('LOG-MIG-')) {
        const lId = String(log.loanId || log.loan_id || '').trim();
        if (seenMigs.has(lId)) return acc; 
        seenMigs.add(lId);
        if (latestMigLog && id !== latestMigLog.id) return acc;
    } else {
        if (migDateStr) {
            const logDateStr = new Date(log.updated_at || log.updatedAt || log.date).toISOString();
            if (logDateStr <= migDateStr) {
                console.log("Ignoring old log:", id, "amount:", log.amount, "date:", logDateStr);
                return acc;
            }
        }
    }
    const amt = typeof log.amount === 'number' ? log.amount : (parseFloat(String(log.amount).replace(/[^\d.-]/g, '')) || 0);
    return acc + amt;
  }, 0);

  let finalPaid = totalFromLogs;
  if (totalFromLogs === 0 && loan) {
    const directPaid = Number(loan.totalPaid || loan.total_paid || 0);
    if (directPaid > 0) finalPaid = directPaid;
  }
  
  console.log("Total from logs:", totalFromLogs);
  console.log("Final paid:", finalPaid);
  console.log("Loan total amount:", loan.total_amount);
  
}
main().catch(console.error);
