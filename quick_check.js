const https = require('https');
const options = {
  hostname: 'samgpnczlznynnfhjjff.supabase.co',
  path: '/rest/v1/clients?select=id,name,branch_id,is_active,deleted_at',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE'
  }
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const clients = JSON.parse(data);
      console.log('TOTAL CLIENTS IN SUPABASE:', clients.length);
      const active = clients.filter(c => !c.deleted_at && c.is_active !== false);
      console.log('ACTIVE AT SUPABASE:', active.length);
      const withBranch = active.filter(c => c.branch_id === 'b3716a78-fb4f-4918-8c0b-92004e3d63ec');
      console.log('WITH CORRECT BRANCH:', withBranch.length);
      const sample = active.slice(0, 3).map(c => ({ id: c.id, name: c.name, branch: c.branch_id }));
      console.log('SAMPLE:', JSON.stringify(sample, null, 2));
    } catch (e) { console.log('ERROR PARSING:', e.message, 'DATA:', data.substring(0, 100)); }
  });
});
req.on('error', e => console.log('REQ ERROR:', e.message));
req.end();
