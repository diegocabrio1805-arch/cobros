const fs = require('fs');
const execSync = require('child_process').execSync;

const scratchDir = 'C:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros';
const desktopDir = 'C:\\Users\\HP\\Desktop\\cobros';

console.log("=== MAPPING WORKSPACES ===");

function checkGit(dir) {
  try {
    const branch = execSync('git branch --show-current', {cwd: dir}).toString().trim();
    const commit = execSync('git rev-parse HEAD', {cwd: dir}).toString().trim();
    const status = execSync('git status --short', {cwd: dir}).toString().trim();
    console.log(`\nDIR: ${dir}`);
    console.log(`BRANCH: ${branch}`);
    console.log(`COMMIT: ${commit}`);
    console.log(`STATUS: ${status ? 'Uncommitted changes' : 'Clean'}`);
  } catch (e) {
    console.log(`\nDIR: ${dir} - NOT A GIT REPO OR ERROR`);
  }
}

checkGit(scratchDir);
checkGit(desktopDir);

console.log("\n=== COMPARING CLIENTS.TSX ===");
try {
  const scratchFile = fs.readFileSync(scratchDir + '\\components\\Clients.tsx', 'utf8');
  const desktopFile = fs.readFileSync(desktopDir + '\\components\\Clients.tsx', 'utf8');
  
  console.log(`Pencil icon in Scratch: ${scratchFile.includes('fa-pen')}`);
  console.log(`Pencil icon in Desktop: ${desktopFile.includes('fa-pen')}`);
  console.log(`Files are identical: ${scratchFile === desktopFile}`);
} catch (e) {
  console.log("Error reading files:", e.message);
}
