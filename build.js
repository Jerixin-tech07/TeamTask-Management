const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [BUILD] Starting client production build...');
execSync('npm --workspace client run build', { stdio: 'inherit' });

const clientDist = path.join(__dirname, 'client', 'dist');
const rootDist = path.join(__dirname, 'dist');

if (fs.existsSync(clientDist)) {
  fs.cpSync(clientDist, rootDist, { recursive: true });
  console.log('✅ [BUILD] Production assets successfully copied to both ./dist and ./client/dist');
} else {
  console.error('❌ [BUILD] client/dist not found!');
  process.exit(1);
}
