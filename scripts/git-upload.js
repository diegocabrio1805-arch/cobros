import { execSync } from 'child_process';

const message = process.argv.slice(2).join(' ') || `Update: ${new Date().toISOString()}`;

try {
    console.log('1. Adding changes...');
    execSync('git add .', { stdio: 'inherit' });
    
    console.log(`2. Committing with message: "${message}"`);
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
    
    console.log('3. Pushing to GitHub...');
    execSync('git push origin main', { stdio: 'inherit' });
    
    console.log('✅ Changes uploaded successfully!');
} catch (error) {
    console.error('❌ Error uploading changes:', error.message);
}
