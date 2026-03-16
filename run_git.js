const { execSync } = require('child_process');
const fs = require('fs');
try {
  let result = execSync('git add . && git commit -m "Fix UI freeze, app crash on tab switch, and bluetooth printing dropping" || echo "No changes"', { encoding: 'utf-8', stdio: 'pipe' });
  result += "\n" + execSync('git push', { encoding: 'utf-8', stdio: 'pipe' });
  fs.writeFileSync('git_out.txt', "SUCCESS:\n" + result);
} catch (e) {
  fs.writeFileSync('git_out.txt', "ERROR:\n" + e.message + "\nSTDOUT:\n" + (e.stdout || '') + "\nSTDERR:\n" + (e.stderr || ''));
}
