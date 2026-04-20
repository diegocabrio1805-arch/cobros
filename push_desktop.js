const { execSync } = require('child_process');
const fs = require('fs');

const cwd = 'c:/Users/HP/Desktop/cobros';

try {
  console.log("Adding files...");
  execSync('git add components/Dashboard.tsx components/CollectorCommission.tsx hooks/useAppActions.ts', { cwd, stdio: 'inherit' });
  
  console.log("Committing files...");
  try {
    execSync('git commit -m "Fix timezone bugs and restore extensive deletion tracking (payments, clients, loans)"', { cwd, stdio: 'inherit' });
  } catch(e) {
    console.log("Nothing to commit or error during commit", e.message);
  }

  console.log("Pushing to GitHub...");
  const token = execSync('gh auth token').toString().trim();
  const url = `https://${token}@github.com/diegocabrio1805-arch/cobros.git`;
  execSync(`git push "${url}" main`, { cwd, stdio: 'inherit' });

  console.log("PUSH SUCCESSFUL FROM DESKTOP!");
} catch(err) {
  console.error("ERROR PUSHING:", err.message);
}
