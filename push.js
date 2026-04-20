const { execSync } = require('child_process');
try {
  let token = execSync('gh auth token').toString().trim();
  console.log("Got token length: " + token.length);
  // URL Encode just in case
  const url = `https://${token}@github.com/diegocabrio1805-arch/cobros.git`;
  execSync(`git remote set-url origin "${url}"`);
  console.log("Remote set. Pushing...");
  const pushOut = execSync('git push origin main').toString();
  console.log("Push OK:", pushOut);
  
  // Trigger build
  const runOut = execSync('gh workflow run android-build.yml').toString();
  console.log("Workflow triggered:", runOut);
} catch (e) {
  console.error("Error:", e.message);
  if (e.stderr) console.error("STDERR:", e.stderr.toString());
}
