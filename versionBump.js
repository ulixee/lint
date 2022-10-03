const { writeFileSync, readFileSync } = require('fs');
const { spawnSync } = require('child_process');

const baseDir = process.cwd();
const pkgJson = readFileSync(`${baseDir}/package.json`, 'utf-8');
const modified = JSON.parse(pkgJson);
if (modified.workspaces) {
  modified.workspaces.packages = modified.workspaces.packages?.filter(
    x => !x.startsWith('..') && !x.includes('/build'),
  );
}
function restoreWorkspace() {
  console.log('Restoring Package.json'); // eslint-disable-line no-console
  writeFileSync(`${baseDir}/package.json`, pkgJson);
}

(async () => {
  console.log('Removing external workspaces from package.json at: ', baseDir); // eslint-disable-line no-console

  if (!modified.workspaces?.packages?.length) {
    let versionArgs = [process.argv[2] ?? '--patch'];
    if (versionArgs[0].match(/^\d/)) {
      versionArgs.unshift('--new-version');
    }
    if (!versionArgs[0].startsWith('--')) versionArgs[0] = '--' + versionArgs[0];

    spawnSync(`yarn`, ['version', ...versionArgs], {
      cwd: process.cwd(),
      stdio: ['inherit', 'inherit', 'inherit', 'inherit'],
    });
  } else {
    writeFileSync(`${baseDir}/package.json`, JSON.stringify(modified, null, 2));
    process.once('beforeExit', restoreWorkspace);
    process.once('exit', restoreWorkspace);
    process.once('SIGINT', restoreWorkspace);
    process.once('SIGTERM', restoreWorkspace);
    spawnSync(
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
    restoreWorkspace();
  }
})().catch(console.error);
