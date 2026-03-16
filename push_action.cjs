const fs = require('fs');
const cp = require('child_process');
try {
  console.log("Fetching token...");
  const token = cp.execSync('gh auth token').toString().trim();
  console.log("Token length:", token.length);
  
  console.log("Updating .git/config...");
  const config = fs.readFileSync('.git/config', 'utf8');
  const newConfig = config.replace(/ghp_[a-zA-Z0-9]+/, token);
  fs.writeFileSync('.git/config', newConfig);
  console.log('Config updated.');
  
  console.log('Pushing to main...');
  const pushOut = cp.execSync('git push origin main');
  console.log('Push summary:', pushOut.toString());
  
  console.log('Triggering GitHub Actions...');
  const runOut = cp.execSync('gh workflow run android-build.yml');
  console.log('Trigger summary:', runOut.toString());
  
  console.log('Done.');
} catch (e) {
  console.error("Fatal Error:", e.message);
  if (e.stderr) console.error("STDERR:", e.stderr.toString());
}
