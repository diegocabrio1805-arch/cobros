import fs from 'fs';
import path from 'path';

const userHome = process.env.USERPROFILE || 'c:\\Users\\Usuario';
const desktopPath = path.join(userHome, 'Desktop');

if (fs.existsSync(desktopPath)) {
  const files = fs.readdirSync(desktopPath);
  files.forEach(file => {
    if (file.toLowerCase().includes('genera_una_secuencia')) {
      console.log(`Found: ${path.join(desktopPath, file)}`);
    }
  });
} else {
  console.log('Desktop path does not exist');
}
