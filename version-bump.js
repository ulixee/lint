const { writeFileSync, readFileSync } = require('fs');
const { spawn } = require('child_process');

const baseDir = process.cwd();
const pkgJson = readFileSync(`${baseDir}/package.json`, 'utf-8');
const modified = JSON.parse(pkgJson);
modified.workspaces.packages = modified.workspaces.packages.filter(
  x => !x.startsWith('..') && !x.includes('/build'),
);
(async () => {
  try {
    console.log('Removing external workspaces from package.json at: ', baseDir); // eslint-disable-line no-console
    writeFileSync(`${baseDir}/package.json`, JSON.stringify(modified, null, 2));
    const child = spawn(
      `lerna`,
      [
        'version',
        process.argv[2] ?? 'patch',
        '--conventional-commits',
        '--no-push',
        '--exact',
        '--force-publish',
      ],
      { cwd: process.cwd(), stdio: ['inherit', 'inherit', 'inherit', 'inherit'] },
    );
    await new Promise((resolve, reject) => {
      child.once('close', resolve);
      child.once('exit', resolve);
      child.once('error', reject);
    });
  } finally {
    console.log('Restoring Package.json'); // eslint-disable-line no-console
    writeFileSync(`${baseDir}/package.json`, pkgJson);
  }
})().catch(console.error);
