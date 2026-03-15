import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const isWindows = process.platform === 'win32';

function killProcesses() {
    console.log('1. Killing blocking processes (Java, Gradle)...');
    try {
        if (isWindows) {
            execSync('taskkill /F /IM java.exe /T', { stdio: 'ignore' });
            execSync('taskkill /F /IM studio64.exe /T', { stdio: 'ignore' });
            execSync('taskkill /F /IM node.exe /T', { stdio: 'ignore' });
        }
    } catch (e) {
        // Ignore errors if processes are not running
    }
}

function cleanBuilds() {
    console.log('2. Cleaning build directories...');
    const buildPaths = [
        path.join('android', 'build'),
        path.join('android', 'app', 'build'),
        'dist'
    ];

    buildPaths.forEach(p => {
        if (fs.existsSync(p)) {
            try {
                fs.rmSync(p, { recursive: true, force: true });
                console.log(`   Cleaned: ${p}`);
            } catch (e) {
                console.warn(`   Could not clean ${p}, moving on...`);
            }
        }
    });
}

try {
    killProcesses();
    cleanBuilds();

    console.log('3. Syncing Capacitor...');
    execSync('npx cap sync android', { stdio: 'inherit' });

    console.log('4. Building APK Release...');
    process.chdir('android');
    const gradlew = isWindows ? 'gradlew.bat' : './gradlew';
    execSync(`${gradlew} assembleRelease --no-daemon --no-watch-fs`, { stdio: 'inherit' });

    console.log('\n✅ APK generated successfully!');
    console.log('Location: android/app/build/outputs/apk/release/app-release.apk');
} catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
}
