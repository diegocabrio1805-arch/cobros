import fs from 'fs';
const src = 'c:/Users/HP/.gemini/antigravity/scratch/cobros';
const dest = 'c:/Users/HP/Desktop/cobros';

const files = [
  'components/Dashboard.tsx',
  'hooks/useAppActions.ts',
  'types.ts',
  'utils/auditReportGenerator.ts',
  'vite.config.ts',
  'package.json',
  'index.html'
];

for (const file of files) {
  try {
    fs.copyFileSync(`${src}/${file}`, `${dest}/${file}`);
    console.log(`Copied ${file}`);
  } catch(e) {
    console.log(`Error ${file}: ${e.message}`);
  }
}
