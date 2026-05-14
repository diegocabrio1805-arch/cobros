const fs = require('fs');
const data = JSON.parse(fs.readFileSync('android/bak_profiles.json', 'utf8'));
const ids = ["a69e2207-db0a-49b7-a764-2787624e5777", "c956ea2f-99d7-4956-93d5-36842aeb0d54", "b3716a78-fb4f-4918-8c0b-92004e3d63ec"];
const results = data.filter(p => ids.includes(p.id));
console.log(JSON.stringify(results, null, 2));
