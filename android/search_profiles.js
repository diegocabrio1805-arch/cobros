
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('bak_profiles.json', 'utf8'));
const target = p.filter(u =>
    u.name.toLowerCase().includes('diego') ||
    u.name.toLowerCase().includes('derlis')
);
console.log(JSON.stringify(target, null, 2));
