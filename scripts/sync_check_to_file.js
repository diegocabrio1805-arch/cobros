const fs = require('fs');
const execSync = require('child_process').execSync;

const scratchDir = 'C:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros';
const desktopDir = 'C:\\Users\\HP\\Desktop\\cobros';

let report = "=== MAPPING WORKSPACES ===\n";

function checkGit(dir) {
  try {
    const branch = execSync('git branch --show-current', {cwd: dir}).toString().trim();
    const commit = execSync('git rev-parse HEAD', {cwd: dir}).toString().trim();
    const status = execSync('git status --short', {cwd: dir}).toString().trim();
    report += `\nDIR: ${dir}\nBRANCH: ${branch}\nCOMMIT: ${commit}\nSTATUS: ${status ? 'Uncommitted changes' : 'Clean'}\n`;
  } catch (e) {
    report += `\nDIR: ${dir} - NOT A GIT REPO OR ERROR\n`;
  }
}

checkGit(scratchDir);
checkGit(desktopDir);

report += "\n=== COMPARING CLIENTS.TSX ===\n";
try {
  const scratchFile = fs.readFileSync(scratchDir + '\\components\\Clients.tsx', 'utf8');
  const desktopFile = fs.readFileSync(desktopDir + '\\components\\Clients.tsx', 'utf8');
  
  report += `Pencil icon in Scratch: ${scratchFile.includes('fa-pen')}\n`;
  report += `Pencil icon in Desktop: ${desktopFile.includes('fa-pen')}\n`;
  report += `Files are identical: ${scratchFile === desktopFile}\n`;
} catch (e) {
  report += "Error reading files: " + e.message + "\n";
}

fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros\\sync_report.txt', report);
