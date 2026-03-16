const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
         if(!file.includes('node_modules') && !file.includes('.git')) {
             results = results.concat(walk(file));
         }
      } else {
         if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
      }
    });
  } catch(e) {}
  return results;
}

const files = walk(path.join(__dirname, 'components')).concat(walk(path.join(__dirname, 'hooks')));
let output = '';
files.forEach(f => {
   const content = fs.readFileSync(f, 'utf8');
   const lines = content.split('\n');
   lines.forEach((l, i) => {
      // Look for any return inside a useEffect (simple heuristic: line starts with return)
      const trimL = l.trim();
      if (trimL.startsWith('return ') && !trimL.includes('=>') && !trimL.includes('<') && !trimL.includes(';')) {
         // might be returning a variable directly
         output += `${f}:${i+1} -> ${trimL}\n`;
      }
      if (trimL.match(/return\s+[a-zA-Z0-9_]+\s*;/)) {
          output += `${f}:${i+1} -> ${trimL} (direct variable return)\n`;
      }
   });
});
fs.writeFileSync('scan_out.txt', output);
