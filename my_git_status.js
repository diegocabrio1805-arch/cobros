const { execSync } = require('child_process');
const fs = require('fs');
try {
  const status = execSync('git status', { encoding: 'utf-8' });
  const diff = execSync('git diff', { encoding: 'utf-8' });
  fs.writeFileSync('my_git_output.txt', "STATUS:\n" + status + "\nDIFF:\n" + diff);
} catch (e) {
  fs.writeFileSync('my_git_output.txt', "ERROR:\n" + e.message);
}
