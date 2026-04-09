const { execSync } = require('child_process');
const fs = require('fs');
try {
  let output = execSync('git add .').toString();
  try {
    output += execSync('git commit -m "feat(PWA): Auto-update engine invisible in background"').toString();
  } catch(e) {} // ignore if nothing to commit
  output += execSync('git push origin main').toString();
  fs.writeFileSync('deploy_log.txt', output);
} catch(e) {
  fs.writeFileSync('deploy_log.txt', e.message + " " + (e.stdout || ''));
}
