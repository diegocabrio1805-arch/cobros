const { execSync } = require('child_process');
const username = 'DDANTE1983';
const password = 'Cobros2026';
const repo = 'diegocabrio1805-arch/cobros';
const url = `https://${username}:${password}@github.com/${repo}.git`;

try {
  console.log('Setting remote URL...');
  execSync(`git remote set-url origin "${url}"`);
  console.log('Pushing to main...');
  const out = execSync('git push origin main').toString();
  console.log('SUCCESS:', out);
} catch (e) {
  console.error('ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout.toString());
  if (e.stderr) console.log('STDERR:', e.stderr.toString());
}
