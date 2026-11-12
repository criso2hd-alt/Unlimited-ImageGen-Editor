'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const project = path.resolve(__dirname, '..');
const filename = 'Unlimited-Image-Studio.exe';
const builder = path.join(project, 'node_modules', 'electron-builder', 'cli.js');

async function main() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [builder, '--win', 'portable', '--x64'], {
      cwd: project, stdio: 'inherit', env: process.env
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`electron-builder exited with ${code}`)));
  });
  const release = path.join(project, 'release');
  await fs.mkdir(release, { recursive: true });
  await fs.copyFile(path.join(project, 'dist', filename), path.join(release, filename));
  console.log(`Portable release: ${path.join(release, filename)}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
