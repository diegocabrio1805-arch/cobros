const fs = require('fs');
const cp = require('child_process');
try {
  let out = cp.execSync('git log -1').toString();
  out += "\n\nSTATUS:\n" + cp.execSync('git status -s').toString();
  fs.writeFileSync('c:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros\\git_result.txt', out);
} catch (e) {
  fs.writeFileSync('c:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros\\git_result.txt', e.message);
}
