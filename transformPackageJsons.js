const fs = require('fs');

module.exports = function transformPackageJsons(rootPackageJson, startDir, buildDir, isDist) {
  console.log('Preparing %s package.json files', isDist ? '/build-dist' : '/build', buildDir);
  const overridesFile = isDist ? 'package.dist.json' : 'package.build.json';

  const rootPackageDefaults = {
    homepage: rootPackageJson.homepage,
    repository: rootPackageJson.repository,
    bugs: rootPackageJson.bugs,
    license: rootPackageJson.license,
    author: rootPackageJson.author,
    contributors: rootPackageJson.contributors,
    engines: rootPackageJson.engines || {
      node: '>=14.0.0',
    },
    publishConfig: {
      access: 'public',
    },
  };

  lookForPackageJsons(buildDir, function (packagePath) {
    const packageJson = JSON.parse(fs.readFileSync(`${packagePath}/package.json`, 'utf8'));
    let overridesJson = {};
    if (fs.existsSync(`${packagePath}/${overridesFile}`)) {
      overridesJson = JSON.parse(fs.readFileSync(`${packagePath}/${overridesFile}`, 'utf8')) ?? {};
      console.log('Has package.json overrides', packagePath, overridesJson);
      if (isDist) fs.unlinkSync(`${packagePath}/${overridesFile}`);
    }

    const finalPackageJson = {
      name: undefined, // put here for order
      version: undefined, // put here for order
      description: undefined, // here for order
      ...rootPackageDefaults,
      ...packageJson,
      ...overridesJson,
    };

    if (isDist && !finalPackageJson.private) {
      delete finalPackageJson.private;
      delete finalPackageJson.workspaces;
      delete finalPackageJson.devDependencies;
      delete finalPackageJson['husky'];
      delete finalPackageJson['lint-staged'];

      if (finalPackageJson.scripts && !overridesJson.scripts) {
        for (const [key, value] of Object.entries(finalPackageJson.scripts)) {
          if (
            key.startsWith('tsc') ||
            key.startsWith('watch') ||
            key.startsWith('build') ||
            key.startsWith('lint')
          ) {
            delete finalPackageJson.scripts[key];
          }
          if (key === 'prepare' && value === 'husky install') delete finalPackageJson.scripts[key];
        }
      }

      if (!fs.existsSync(`${packagePath}/LICENSE`) && !fs.existsSync(`${packagePath}/LICENSE.md`)) {
        fs.copyFileSync(`${__dirname}/LICENSE.md`, `${packagePath}/LICENSE.md`);
      }
    }

    if (finalPackageJson.main && !finalPackageJson.types) {
      finalPackageJson.types = finalPackageJson.main.replace('.js', '.d.ts');
    }

    // check if index exists
    if (!finalPackageJson.files && !finalPackageJson.main) {
      if (fs.existsSync(`${packagePath}/index.js`)) {
        finalPackageJson.main = 'index.js';
      }
    }

    if (finalPackageJson.private) {
      delete finalPackageJson.publishConfig;
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
  });
};

function lookForPackageJsons(path, processFn) {
  for (const fileOrDir of fs.readdirSync(path)) {
    if (fileOrDir === 'node_modules' || fileOrDir.startsWith('.')) continue;

    const fullpath = `${path}/${fileOrDir}`;
    const stat = fs.lstatSync(fullpath);
    if (stat.isDirectory()) {
      lookForPackageJsons(fullpath, processFn);
    } else if (stat.isFile() && fileOrDir === 'package.json') {
      processFn(path);
    }
  }
}
