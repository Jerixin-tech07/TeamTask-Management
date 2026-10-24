import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 [BUILD] Starting production build...');

execSync('npx vite build', { cwd: __dirname, stdio: 'inherit' });

const clientDist = path.join(__dirname, 'dist');
const rootDist = path.resolve(__dirname, '..', 'dist');

try {
  if (fs.existsSync(clientDist)) {
    fs.cpSync(clientDist, rootDist, { recursive: true });
    console.log('✅ [BUILD] Assets populated in both ./dist and ./client/dist');
  }
} catch (e) {
  console.warn('[BUILD] Copy warning:', e.message);
}
