const fs = require('fs');
const data = JSON.parse(fs.readFileSync('android/bak_clients.json', 'utf8'));
const target = "NORMA";
const results = data.filter(c => c.name.includes(target));
results.forEach(r => console.log(`${r.id} | ${r.name} | AddedBy: ${r.added_by}`));
