const fs = require('fs');
const content = fs.readFileSync('hooks/useSync.ts', 'utf8');
let balance = 0;
let line = 1;
const lines = content.split('\n');
for (const l of lines) {
    for (const char of l) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    // Only print lines where balance changes to 0 or becomes negative, or every 100 lines
    if (balance === 0 || line % 100 === 0) {
        console.log(`Line ${line}: Balance ${balance} | ${l.trim().substring(0, 40)}`);
    }
    line++;
}
console.log('Final Balance:', balance);
