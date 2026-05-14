const fs = require('fs');
const data = JSON.parse(fs.readFileSync('android/bak_clients.json', 'utf8'));
const target = "NORMA ELIZABETH BENITEZ DE BENITEZ";
const results = data.filter(c => c.name.includes(target));
console.log(JSON.stringify(results, null, 2));
