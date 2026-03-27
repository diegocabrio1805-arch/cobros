const { execSync } = require('child_process');
const fs = require('fs');
try {
  let r = execSync('git add . && git commit -m "Fix BT ping and modal state"');
  r += execSync('git push');
  fs.writeFileSync('git_out2.txt', "SUCCESS:\n" + r.toString());
} catch(e) {
  fs.writeFileSync('git_out2.txt', "ERROR:\n" + e.message + "\n" + e.stdout + "\n" + e.stderr);
}
