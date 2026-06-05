import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\f4d082e2-152a-421f-80dd-497cae03d8ef';
const destPath = 'C:\\Users\\Usuario\\Desktop\\video anexo\\referencia_corte_2.png';

async function main() {
  if (!fs.existsSync(brainDir)) {
    console.log('Brain directory does not exist.');
    process.exit(1);
  }

  console.log('Searching for the most recent image in the brain folder...');
  const files = fs.readdirSync(brainDir);
  const imageFiles = files
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp'))
    .map(f => {
      const filePath = path.join(brainDir, f);
      const stat = fs.statSync(filePath);
      return { name: f, path: filePath, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (imageFiles.length === 0) {
    console.log('No images found in the brain folder.');
    process.exit(1);
  }

  const mostRecent = imageFiles[0];
  console.log(`Most recent image: ${mostRecent.name} (modified at ${new Date(mostRecent.mtime).toISOString()})`);

  // Copy to destination
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(mostRecent.path, destPath);
  console.log(`✅ Copied to: ${destPath}`);
}

main().catch(console.error);
