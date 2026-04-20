import { execSync } from 'child_process';
import fs from 'fs';

const repoUrl = 'https://github.com/diegocabrio1805-arch/cobros.git';

try {
    console.log('--- Configurando Repositorio Git ---');
    
    if (!fs.existsSync('.git')) {
        console.log('[1] Inicializando nuevo repositorio...');
        execSync('git init', { stdio: 'inherit' });
    }

    console.log('[2] Configurando remoto origin...');
    try {
        execSync(`git remote add origin ${repoUrl}`, { stdio: 'inherit' });
    } catch (e) {
        console.log('   El remoto ya existe o hubo un aviso, intentando actualizar...');
        execSync(`git remote set-url origin ${repoUrl}`, { stdio: 'inherit' });
    }

    console.log('[3] Preparando archivos...');
    execSync('git add .', { stdio: 'inherit' });

    console.log('[4] Creando commit inicial...');
    execSync('git commit -m "Actualización del sistema - Atlas"', { stdio: 'inherit' });

    console.log('[5] Subiendo a GitHub (main)...');
    console.log('⚠️  Es posible que se te pida iniciar sesión en GitHub en una ventana emergente.');
    execSync('git push -f origin main', { stdio: 'inherit' });

    console.log('\n✅ ¡GitHub actualizado con éxito!');
} catch (error) {
    console.error('\n❌ Error durante la reconexión:', error.message);
    console.log('\n💡 Tip: Asegúrate de que Git esté instalado y que tengas permisos en el repositorio.');
}
