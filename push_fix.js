const { execSync } = require('child_process');
try {
  execSync('git add hooks/useAppInitialization.ts');
  execSync('git commit -m "Fix auto-updater 404 path"');
  let token = execSync('gh auth token').toString().trim();
  const url = `https://${token}@github.com/diegocabrio1805-arch/cobros.git`;
  execSync(`git remote set-url origin "${url}"`);
  execSync('git push origin main');
  console.log("SUCCESS");
} catch (e) {
  console.error("ERROR", e.message);
}
