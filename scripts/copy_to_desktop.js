const fs = require('fs');
const path = require('path');

const srcFiles = [
  'hooks/useAppActions.ts',
  'hooks/useSync.ts',
  'components/Clients.tsx',
  'package.json'
];

const sourceDir = 'C:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros';
const destDir = 'C:\\Users\\HP\\Desktop\\cobros';

srcFiles.forEach(file => {
  const srcPath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to Desktop`);
  }
});
