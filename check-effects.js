const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('.expo') && !fullPath.includes('dist') && !fullPath.includes('build')) {
          results = results.concat(walk(fullPath));
        }
      } else {
        if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
          results.push(fullPath);
        }
      }
    });
  } catch(e) {}
  return results;
}

const files = walk(__dirname);
console.log("Found " + files.length + " files.");
let hasErrors = false;
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.match(/useEffect\s*\(\s*async/)) {
    console.log("CRASH CAUSE A FOUND IN:", f, "useEffect(async...)");
    hasErrors = true;
  }
  
  // also check for return values that are objects or promises
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.match(/return\s+new\s+Promise/)) {
      console.log("CRASH CAUSE B FOUND IN:", f, "LINE:", i+1, "Promise Return");
      hasErrors = true;
    }
  });

  // check if useEffect implicitly returns
  // like useEffect(() => fetchSomething()) which returns a Promise if fetchSomething is async
  lines.forEach((l, i) => {
      if (l.match(/useEffect\(\(\)\s*=>\s*[^{]*\)/)) {
          console.log("POTENTIAL CRASH C:", f, "LINE:", i+1, "Implicit Return", l.trim());
      }
  });
});

if (!hasErrors) console.log("NO ASYNC EFFECT CAUSES DETECTED.");
