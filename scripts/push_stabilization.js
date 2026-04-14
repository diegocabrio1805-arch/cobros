import { execSync } from 'child_process';

const CWD = 'c:/Users/HP/.gemini/antigravity/scratch/cobros';

try {
  console.log("--- START DEPLOY PROCESS (STABILIZATION) ---");
  
  // 1. Stage changes
  console.log("Staging stabilized files...");
  execSync('git add index.html hooks/useAppInitialization.ts App.tsx', { cwd: CWD, stdio: 'inherit' });
  
  // 2. Commit
  console.log("Committing optimization...");
  try {
    execSync('git commit -m "Fix: Stabilize boot sequence and optimize for low-end Android devices (v6.7.6)"', { cwd: CWD, stdio: 'inherit' });
  } catch (e) {
    console.log("No new changes to commit.");
  }

  // 3. Push
  console.log("Pushing to GitHub...");
  execSync(`git push origin main`, { cwd: CWD, stdio: 'inherit' });
  
  console.log("--- DEPLOY SUCCESSFUL ---");
} catch (error) {
  console.error("--- DEPLOY FAILED ---");
  console.error(error.message);
  process.exit(1);
}
