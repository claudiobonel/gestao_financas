const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = __dirname;
const distDir = path.join(root, 'dist');
const zipPath = path.join(distDir, 'gestao-financeira-app.zip');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

const files = [
  'README.md',
  'index.html',
  'styles.css',
  'app.js',
  'server.js',
  'package.json',
  'iniciar-windows.bat',
  'iniciar-linux-mac.sh',
];

const quoted = files.map((file) => `"${file}"`).join(' ');

execSync(`zip -j -q "${zipPath}" ${quoted}`, { cwd: root, stdio: 'inherit' });

console.log(`Pacote criado com sucesso: ${zipPath}`);
