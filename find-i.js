const fs = require('fs');
const path = require('path');

const file = fs.readdirSync('./dist/assets').find(f => f.startsWith('index-') && f.endsWith('.js') && !f.includes('legacy'));
if (!file) {
    console.log("No index file found.");
    process.exit(1);
}

const content = fs.readFileSync(path.join('./dist/assets', file), 'utf8');

// We are looking for i as a variable being called: `i(` or `i.(` or something.
// And we also want to see `t.filter(i=>...)` NO, `i is not a function` means the callee is `i`.
// So it must be `i(`
const regex = /[^a-zA-Z0-9_$]i\(/g;
let match;
const results = [];
while ((match = regex.exec(content)) !== null) {
    const start = Math.max(0, match.index - 50);
    const end = Math.min(content.length, match.index + 50);
    results.push(content.substring(start, end).replace(/\n/g, ' '));
}

fs.writeFileSync('i_output_real.txt', results.join('\n---\n'));
console.log("Wrote " + results.length + " results to i_output_real.txt");
