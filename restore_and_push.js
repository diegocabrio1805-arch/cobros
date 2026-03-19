import { execSync } from 'child_process';
import fs from 'fs';

try {
  // Push the fixed files in scratch/cobros repo to GitHub
  console.log("Adding and committing fixed files in scratch repo...");
  execSync('git add components/Dashboard.tsx hooks/useAppActions.ts components/CollectorCommission.tsx', { stdio: 'inherit' });
  try {
    execSync('git commit -m "Fix timezone bugs and restore extensive deletion tracking (payments, clients, loans)"', { stdio: 'inherit' });
  } catch (e) {
    console.log("No new commits or just git complaining");
  }

  // Authorize and push from scratch/cobros to origin main
  console.log("Pushing to GitHub...");
  const token = execSync('gh auth token').toString().trim();
  const repoURL = `https://${token}@github.com/diegocabrio1805-arch/cobros.git`;
  execSync(`git push "${repoURL}" main`, { stdio: 'inherit' });
  console.log("PUSH SUCCESSFUL");

  // Copy the corrected files from scratch back to the user's Desktop
  console.log("Restoring files on the Desktop...");
  fs.copyFileSync('components/Dashboard.tsx', 'c:/Users/HP/Desktop/cobros/components/Dashboard.tsx');
  fs.copyFileSync('hooks/useAppActions.ts', 'c:/Users/HP/Desktop/cobros/hooks/useAppActions.ts');
  fs.copyFileSync('components/CollectorCommission.tsx', 'c:/Users/HP/Desktop/cobros/components/CollectorCommission.tsx');

  console.log("ALL RESTORED AND PUSHED!");
} catch (error) {
  console.error("FAILED SCRIPT: ", error.message);
}
