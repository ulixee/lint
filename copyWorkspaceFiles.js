// eslint-disable-next-line import/no-extraneous-dependencies,import/no-self-import
const copyfiles = require('copyfiles');
const Fs = require('fs');
const Path = require('path');

module.exports = function copyWorkspace(pkg, baseDir, copyToDir) {
  const isStandardBuild = !copyToDir.includes('dist');

  const workspaces = [];
  const packages = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages ?? [];
  for (const packageGlob of packages || []) {
    if (packageGlob.startsWith('../') || packageGlob.includes('/build')) continue;

    let workspacePath = packageGlob;
    if (workspacePath.endsWith('/*')) {
      workspacePath = workspacePath.replace('/*', '');
      for (const subdir of Fs.readdirSync(Path.resolve(baseDir, workspacePath))) {
        if (subdir === 'node_modules') continue;
        if (!Fs.statSync(Path.resolve(baseDir, workspacePath, subdir)).isDirectory()) continue;
        if (!Fs.existsSync(Path.resolve(baseDir, workspacePath, subdir, 'package.json'))) continue;
        workspaces.push(`${workspacePath}/${subdir}`);
      }
    } else {
      workspaces.push(workspacePath);
    }
  }

  const copyArgs = [
    '-e "node_modules"',
    'package*.json',
    'examples/*.js',
    'examples/*.mjs',
    '.yarnrc.yml',
    '.yarn/**/*',
    '*.md',
    '.*ignore',
    '.env.*',
  ];
  if (isStandardBuild) {
    copyArgs.push('testing/*/**', 'yarn.lock');
  }

  for (const workspace of workspaces) {
    if (isStandardBuild) {
      copyArgs.push(`${workspace}/data/**/*`, `${workspace}/test/*/**`);
    }
    copyArgs.push(
      `${workspace}/assets/**/*`,
      `${workspace}/public/**/*`,
      `${workspace}/.ulixee/*`,
      `${workspace}/package*.json`,
      `${workspace}/*/*.sql`,
      `${workspace}/*/migrations/*.sql`,
      `${workspace}/*/*.json`,
      `${workspace}/*/*.html`,
      `${workspace}/*/*.png`,
      `${workspace}/go/*.*`,
      `${workspace}/*.cjs`,
      `${workspace}/.env*`,
      `${workspace}/*.mjs`,
      `${workspace}/*.md`,
      `${workspace}/lib/**/*.mjs`,
      `${workspace}/lib/**/*.cjs`,
      `${workspace}/.*ignore`,
      `${workspace}/*.sh`,
    );
  }

  if (isStandardBuild) copyArgs.push('-a');

  return new Promise(resolve => {
    copyfiles([...copyArgs, copyToDir], {}, () => {
      // eslint-disable-next-line no-console
      console.log('Files Copied');
      resolve();
    });
  });
};
