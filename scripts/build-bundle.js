import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const isWindows = process.platform === 'win32';

try {
    console.log('--- Generando Bundle (.aab) para Google Play Store ---');

    console.log('[1] Limpiando carpetas de compilación...');
    const buildPaths = [path.join('android', 'app', 'build'), 'dist'];
    buildPaths.forEach(p => {
        if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    });

    console.log('[2] Compilando Web Bundle (Vite)...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('[3] Sincronizando con Capacitor...');
    execSync('npx cap sync android', { stdio: 'inherit' });

    console.log('[4] Generando Android App Bundle (.aab)...');
    process.chdir('android');
    const gradlew = isWindows ? 'gradlew.bat' : './gradlew';
    
    // Comando para generar el Bundle (AAB) en lugar del APK
    execSync(`${gradlew} bundleRelease --no-daemon`, { stdio: 'inherit' });

    console.log('\n✅ ¡Bundle generado con éxito!');
    console.log('Ubicación: android/app/build/outputs/bundle/release/app-release.aab');
    console.log('\n💡 Siguiente paso: Sube este archivo a Google Play Console.');
} catch (error) {
    console.error('\n❌ Error durante la generación:', error.message);
}
