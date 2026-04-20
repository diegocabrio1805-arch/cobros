const { execSync } = require('child_process');
try {
  execSync('git add .');
  try { execSync('git commit -m "force logic update for deletes"'); } catch(e){}
  let token = execSync('gh auth token').toString().trim();
  const url = `https://${token}@github.com/diegocabrio1805-arch/cobros.git`;
  execSync(`git remote set-url origin "${url}"`);
  const out = execSync('git push origin main').toString();
  console.log("PUSH SUCCESS:\n", out);
} catch(e) {
  console.log("ERR", e.message, e.stdout?.toString(), e.stderr?.toString());
}
