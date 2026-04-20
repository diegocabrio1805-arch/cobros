const { execSync } = require('child_process');
const token = 'Cobros2026'; // Based on askpass.js
const username = 'DDANTE1983';
const repo = 'diegocabrio1805-arch/cobros';
const url = `https://${username}:${token}@github.com/${repo}.git`;

function run(cmd) {
  try {
    console.log(`Running: ${cmd}`);
    const out = execSync(cmd).toString();
    console.log(out);
  } catch (e) {
    console.error(`Error running ${cmd}: ${e.message}`);
    if (e.stdout) console.log(`STDOUT: ${e.stdout.toString()}`);
    if (e.stderr) console.log(`STDERR: ${e.stderr.toString()}`);
    process.exit(1);
  }
}

console.log('--- START PUSH ---');
run('git config user.name "DDANTE1983"');
run('git config user.email "diegocabrio1805@gmail.com"'); // Assuming based on repo name
run(`git remote set-url origin "${url}"`);
run('git add .');
// Use a generic message as it was already committed once but let's be sure
try { execSync('git commit -m "feat: optimize APK for low-end devices (Samsung/Xiaomi) - v6.7.1"'); } catch(e) {}
run('git push origin main --force');
console.log('--- PUSH COMPLETED ---');
