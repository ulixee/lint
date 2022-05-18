const fs = require('fs');
const copyWorkspace = require('./copy-workspace');

const startDir = process.cwd();
const isDist = process.argv.includes('--dist');
const buildDir = isDist ? `${startDir}/build-dist` : `${startDir}/build`;
const overridesFile = isDist ? 'package.dist.json' : 'package.build.json';
console.log('Preparing %s package.json files', isDist ? '/build-dist' : '/build', buildDir);

const rootPackageJson = JSON.parse(fs.readFileSync(`${startDir}/package.json`));

const defaults = {
  repository: rootPackageJson.repository,
  license: rootPackageJson.license,
  author: rootPackageJson.author,
  contributors: rootPackageJson.contributors,
  engines: {
    node: '>=14.0.0',
  },
  publishConfig: {
    access: 'public',
  },
};

const licensePath = `${__dirname}/LICENSE.md`;

function processPackageJson(packagePath) {
  const packageJson = JSON.parse(fs.readFileSync(`${packagePath}/package.json`, 'utf8'));
  const readmePath = `${packagePath}/README.md`;
  let overridesJson = {};
  if (fs.existsSync(`${packagePath}/${overridesFile}`)) {
    overridesJson = JSON.parse(fs.readFileSync(`${packagePath}/${overridesFile}`, 'utf8'));
    console.log('Has package.json overrides', packagePath, overridesJson);
    if (isDist) fs.unlinkSync(`${packagePath}/${overridesFile}`);
  }

  let finalPackageJson;
  if (isDist) {
    fs.copyFileSync(licensePath, `${packagePath}/LICENSE.md`);
    if (fs.existsSync(readmePath)) fs.copyFileSync(readmePath, `${packagePath}/README.md`);
    finalPackageJson = {
      name: overridesJson.name || packageJson.name,
      scripts: overridesJson.scripts,
      dependencies: overridesJson.dependencies || packageJson.dependencies,
      description: overridesJson.description || packageJson.description,
      main: overridesJson.main || packageJson.main,
      types: overridesJson.types || packageJson.types,
      exports: overridesJson.exports || packageJson.exports,
      files: overridesJson.files || packageJson.files,
      homepage: packageJson.homepage || rootPackageJson.homepage,
      bugs: packageJson.bugs || rootPackageJson.bugs,
      ...defaults,
      bin: packageJson.bin,
    };

    if (overridesJson.private === false) {
      delete finalPackageJson.private;
    } else if (packageJson.private) {
      if (!packageJson.workspaces) return;
      finalPackageJson.private = true;
      finalPackageJson.publishConfig = undefined;
      finalPackageJson.workspaces = overridesJson.workspaces ?? packageJson.workspaces;
    }

    // check if index exists
    if (!finalPackageJson.files && !finalPackageJson.main) {
      if (fs.existsSync(`${packagePath}/index.js`)) {
        finalPackageJson.main = 'index.js';
      }
    }
    if (finalPackageJson.main && !finalPackageJson.types) {
      finalPackageJson.types = finalPackageJson.main.replace('.js', '.d.ts');
    }
  } else {
    if (!overridesJson) return;

    finalPackageJson = {
      ...packageJson,
      name: overridesJson.name || packageJson.name,
      scripts: overridesJson.scripts || packageJson.scripts,
      dependencies: overridesJson.dependencies || packageJson.dependencies,
      devDependencies: overridesJson.devDependencies || packageJson.devDependencies,
      workspaces: overridesJson.workspaces || packageJson.workspaces,
      private: overridesJson.private || packageJson.private,
    };
  }

  if (finalPackageJson.workspaces && finalPackageJson.workspaces.packages) {
    finalPackageJson.workspaces.packages = finalPackageJson.workspaces.packages.map(x => {
      if (x.startsWith('../') && !fs.existsSync(`${buildDir}/${x.replace('/*', '')}`)) {
        return `../${x}`;
      }
      if (x.includes('/build') && !fs.existsSync(`${buildDir}/${x.replace('/*', '')}`)) {
        return `../${x}`;
      }
      return x;
    });
  }
  console.log('writing', `${packagePath}/package.json`);
  fs.writeFileSync(`${packagePath}/package.json`, JSON.stringify(finalPackageJson, null, 2));
}

function processDir(path) {
  for (const fileOrDir of fs.readdirSync(path)) {
    if (fileOrDir === 'node_modules' || fileOrDir.startsWith('.')) continue;

    const fullpath = `${path}/${fileOrDir}`;
    const stat = fs.lstatSync(fullpath);
    if (stat.isDirectory()) {
      processDir(fullpath);
    } else if (stat.isFile() && fileOrDir === 'package.json') {
      processPackageJson(path);
    }
  }
}

copyWorkspace(rootPackageJson, startDir, buildDir).then(() => {
  processDir(buildDir);
});
