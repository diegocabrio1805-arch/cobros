const { execSync } = require('child_process');
const fs = require('fs');

function scheduleDeployment() {
  const target = new Date();
  target.setHours(21, 0, 0, 0);

  const now = new Date();
  if (now > target) {
    // Si ya pasaron las 21, programa para mañana a las 21
    target.setDate(target.getDate() + 1);
  }

  const delayMs = target.getTime() - now.getTime();
  
  // Guardamos info para loguear que se quedó esperando
  fs.writeFileSync('deploy_21hs_log.txt', `[${now.toLocaleString()}] Script iniciado. Esperando ${Math.round(delayMs / 1000 / 60)} minutos para lanzar a las 21:00 hs...`);

  setTimeout(() => {
    try {
      fs.appendFileSync('deploy_21hs_log.txt', `\n[${new Date().toLocaleString()}] Iniciando commit y push...`);
      
      execSync('git add hooks/useAppInitialization.ts');
      execSync('git commit -m "Fix auto-updater 404 path"');
      
      let token = execSync('gh auth token').toString().trim();
      const url = `https://${token}@github.com/diegocabrio1805-arch/cobros.git`;
      execSync(`git remote set-url origin "${url}"`);
      execSync('git push origin main');
      
      fs.appendFileSync('deploy_21hs_log.txt', `\n[${new Date().toLocaleString()}] ¡ÉXITO! Los cambios fueron enviados a GitHub. GitHub Pages compilará la versión ahora.`);
      process.exit(0);
    } catch (e) {
      fs.appendFileSync('deploy_21hs_log.txt', `\n[${new Date().toLocaleString()}] ERROR al ejecutar: ${e.message}`);
    }
  }, delayMs);
}

scheduleDeployment();
