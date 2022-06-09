#!/usr/bin/env node

const Fs = require('fs');
const Path = require('path');

const baseDir = process.cwd();
const shouldFix = process.argv[2] === 'fix';
const pkgPaths = new Set();

recursivelyFindPackageFiles(Path.resolve(baseDir, 'package.json'));

const pkgVersionByName = {};
for (const pkgPath of Array.from(pkgPaths)) {
  const pkg = require(pkgPath);
  pkgVersionByName[pkg.name] = pkg.version;
  if (!pkg.version) {
    console.log(`MISSING version ${pkg.name}`);
  }
}

console.log('Checking Workspace Dependencies match these versions', pkgVersionByName);

for (const pkgPath of Array.from(pkgPaths)) {
  const pkg = require(pkgPath);
  checkDependencies('dependency', pkg?.dependencies, pkgPath);
  checkDependencies('devDependency', pkg?.devDependencies, pkgPath);
  checkDependencies('peerDependencies', pkg?.peerDependencies, pkgPath);
  Fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

for (const sourcePkgPath of Array.from(pkgPaths)) {
  for (const overrides of ['package.build.json', 'package.dist.json']) {
    const pkgPath = sourcePkgPath.replace('package.json', overrides);
    if (!Fs.existsSync(pkgPath)) continue;
    const pkg = require(pkgPath);
    checkDependencies('dependency', pkg?.dependencies, pkgPath);
    checkDependencies('devDependency', pkg?.devDependencies, pkgPath);
    checkDependencies('peerDependencies', pkg?.peerDependencies, pkgPath);
    Fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

// HELPERS /////////////////////////////////////////////////////////////////////////////////////////////////////////////

function checkDependencies(type, dependencies, pkgPath) {
  for (const [name, version] of Object.entries(dependencies || {})) {
    const versionToBe = pkgVersionByName[name];
    if (versionToBe && versionToBe !== version) {
      if (shouldFix) {
        dependencies[name] = versionToBe;
        console.log(`UPGRADED ${name} from ${version} to ${versionToBe}: ${pkgPath}`);
      } else {
        console.log(
          `MISMATCHED dependency version for ${name} (${version} should be ${versionToBe}): ${pkgPath}`,
        );
      }
    }
  }
}

function recursivelyFindPackageFiles(pkgPath) {
  if (!Fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(Fs.readFileSync(pkgPath, 'utf8'));
  const pkgDir = Path.dirname(pkgPath);
  if (pkgDir.startsWith('build')) return;

  const workspaces = pkg.workspaces?.packages?.map(x => x.replace('/build', '')) || [];
  for (const workspace of workspaces) {
    if (workspace.includes('/*')) {
      const workspaceDir = workspace.replace('/*', '');
      const subWorkspaces = Fs.readdirSync(Path.resolve(pkgDir, workspaceDir));
      for (const subWorkspace of subWorkspaces) {
        if (subWorkspace.startsWith('build')) continue;
        const newPkgPath = Path.resolve(pkgDir, workspaceDir, subWorkspace, 'package.json');
        if (Fs.existsSync(newPkgPath)) {
          recursivelyFindPackageFiles(newPkgPath);
          pkgPaths.add(newPkgPath);
        }
      }
    } else {
      const newPkgPath = Path.resolve(pkgDir, workspace, 'package.json');
      if (Fs.existsSync(newPkgPath)) {
        recursivelyFindPackageFiles(newPkgPath);
        pkgPaths.add(newPkgPath);
      }
    }
  }
}
