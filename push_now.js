const { execSync } = require('child_process');

try {
  console.log('Agregando archivos modificados del frontend...');
  execSync('git add App.tsx components/ hooks/ vite.config.ts');
  
  console.log('Creando commit...');
  execSync('git commit -m "Fix auto-updater 404 path and force sync update"');
  
  console.log('Autenticando con GitHub...');
  let token = execSync('gh auth token').toString().trim();
  const url = `https://${token}@github.com/diegocabrio1805-arch/cobros.git`;
  execSync(`git remote set-url origin "${url}"`);
  
  console.log('Subiendo a Producción...');
  execSync('git push origin main');
  
  console.log('¡ÉXITO! Cambios publicados en Producción.');
} catch (e) {
  console.error('ERROR:', e.message);
}
