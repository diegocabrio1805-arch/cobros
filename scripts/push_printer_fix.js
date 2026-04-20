import { execSync } from 'child_process';

const CWD = 'c:/Users/HP/.gemini/antigravity/scratch/cobros';

try {
  console.log("--- START PUSH PROCESS ---");
  
  // 1. Stage all changes
  console.log("Staging modified files...");
  execSync('git add services/bluetoothPrinterService.ts hooks/useAppInitialization.ts index.html', { cwd: CWD, stdio: 'inherit' });
  
  // 2. Commit
  console.log("Committing changes...");
  try {
    execSync('git commit -m "Fix: Bluetooth printer connectivity improvements and version bump to 6.7.5-STABLE"', { cwd: CWD, stdio: 'inherit' });
  } catch (e) {
    console.log("Nothing to commit or commit failed (maybe no changes?)");
  }

  // 3. Get token and push
  console.log("Obtaining token from gh CLI...");
  const token = execSync('gh auth token').toString().trim();
  const repoURL = `https://${token}@github.com/diegocabrio1805-arch/cobros.git`;
  
  console.log("Pushing to GitHub (main)...");
  execSync(`git push "${repoURL}" main`, { cwd: CWD, stdio: 'inherit' });
  
  console.log("--- PUSH SUCCESSFUL ---");
} catch (error) {
  console.error("--- SCRIPT FAILED ---");
  console.error(error.message);
  process.exit(1);
}
