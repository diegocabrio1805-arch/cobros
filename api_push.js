const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'Cobros2026';
const OWNER = 'diegocabrio1805-arch';
const REPO = 'cobros';

const FILES = [
  'package.json',
  'capacitor.config.ts',
  'android/variables.gradle',
  'android/app/build.gradle',
  '.github/workflows/android-build.yml',
];

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'Authorization': 'token ' + TOKEN,
        'User-Agent': 'cobros-push-script',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch(e) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFileSha(filePath) {
  const res = await apiRequest('GET', `/repos/${OWNER}/${REPO}/contents/${filePath}`);
  if (res.status === 200) return res.body.sha;
  return null;
}

async function updateFile(filePath, content, sha) {
  const encoded = Buffer.from(content).toString('base64');
  const body = {
    message: 'feat: optimize APK for low-end devices - v6.7.1',
    content: encoded,
    sha,
    branch: 'main',
  };
  const res = await apiRequest('PUT', `/repos/${OWNER}/${REPO}/contents/${filePath}`, body);
  if (res.status === 200 || res.status === 201) {
    console.log(`  OK: ${filePath}`);
    return true;
  }
  console.error(`  FAIL (${res.status}): ${filePath}`, JSON.stringify(res.body));
  return false;
}

async function main() {
  console.log('=== GitHub API Push ===');
  
  // First test auth
  const me = await apiRequest('GET', '/user');
  if (me.status !== 200) {
    console.error('Auth failed:', me.status, JSON.stringify(me.body));
    process.exit(1);
  }
  console.log('Authenticated as:', me.body.login);
  
  for (const file of FILES) {
    const localPath = path.join(__dirname, file.replace(/\//g, path.sep));
    if (!fs.existsSync(localPath)) {
      console.log(`  SKIP (not found): ${file}`);
      continue;
    }
    const content = fs.readFileSync(localPath, 'utf8');
    console.log(`Updating: ${file}`);
    const sha = await getFileSha(file);
    if (!sha) { console.error(`  Cannot get SHA for ${file}`); continue; }
    await updateFile(file, content, sha);
  }
  
  console.log('\nDone. GitHub Actions build should start now.');
  console.log('Check: https://github.com/diegocabrio1805-arch/cobros/actions');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
