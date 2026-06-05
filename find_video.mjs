import fs from 'fs';
import path from 'path';

const userHome = process.env.USERPROFILE || 'c:\\Users\\Usuario';
const searchDirs = [
  path.join(userHome, 'Desktop'),
  path.join(userHome, 'OneDrive', 'Escritorio'),
  path.join(userHome, 'OneDrive - Personal', 'Escritorio'),
  path.join(userHome, 'Desktop', 'video anexo'),
  path.join(userHome, 'OneDrive', 'Escritorio', 'video anexo'),
  path.join(userHome, 'OneDrive - Personal', 'Escritorio', 'video anexo')
];

console.log('Searching for video files...');
searchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Checking directory: ${dir}`);
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.toLowerCase().includes('corte_segundos') || file.toLowerCase().includes('el_ga')) {
          console.log(`Found: ${path.join(dir, file)}`);
        }
      });
    } catch (e) {
      console.error(`Error reading ${dir}:`, e.message);
    }
  }
});
