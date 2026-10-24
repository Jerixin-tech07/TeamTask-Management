const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [BUILD] Starting production build...');

const isInsideClient = __dirname.endsWith('client') || __dirname.endsWith('client' + path.sep);
const clientDir = isInsideClient ? __dirname : path.join(__dirname, 'client');
const rootDir = isInsideClient ? path.resolve(__dirname, '..') : __dirname;

execSync('npx vite build', { cwd: clientDir, stdio: 'inherit' });

const clientDist = path.join(clientDir, 'dist');
const rootDist = path.join(rootDir, 'dist');

try {
  if (fs.existsSync(clientDist)) {
    fs.cpSync(clientDist, rootDist, { recursive: true });
    console.log('✅ [BUILD] Assets populated in both ./dist and ./client/dist');
  }
} catch (e) {
  console.warn('[BUILD] Copy warning:', e.message);
}
