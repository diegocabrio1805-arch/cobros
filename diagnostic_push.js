const { spawn } = require('child_process');
const token = 'Cobros2026'; // From askpass.js
const username = 'DDANTE1983';
const repo = 'diegocabrio1805-arch/cobros';
const url = `https://${username}:${token}@github.com/${repo}.git`;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    console.log(`> ${cmd} ${args.join(' ')}`);
    const p = spawn(cmd, args, { shell: true });
    
    p.stdout.on('data', (data) => process.stdout.write(data));
    p.stderr.on('data', (data) => process.stderr.write(data));
    
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
  });
}

async function start() {
  try {
    await run('git', ['config', 'user.name', '"DDANTE1983"']);
    await run('git', ['config', 'user.email', '"diegocabrio1805@gmail.com"']);
    await run('git', ['remote', 'set-url', 'origin', `"${url}"`]);
    await run('git', ['add', '.']);
    try { await run('git', ['commit', '-m', '"feat: optimize APK for low-end devices - v6.7.1"']); } catch(e) {}
    await run('git', ['push', 'origin', 'main', '--force']);
    console.log('SUCCESS');
  } catch (e) {
    console.error('FATAL:', e.message);
  }
}

start();
