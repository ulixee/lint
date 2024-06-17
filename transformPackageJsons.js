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
      node: '>=18.0.0',
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
      main: undefined, // here for order
      types: undefined, // here for order
      exports: undefined, // here for order
      dependencies: undefined, // here for order
      devDependencies: undefined, // here for order
      ...packageJson,
      ...overridesJson,
    };

    if (isDist && !finalPackageJson.private) {
      delete finalPackageJson.private;
      delete finalPackageJson.workspaces;
      delete finalPackageJson['husky'];
      delete finalPackageJson['lint-staged'];
  
      if (!overridesJson.devDependencies || (!finalPackageJson.devDependencies && !finalPackageJson.devDependencies.length)) {
        delete finalPackageJson.devDependencies;
      }

      if (!fs.existsSync(`${packagePath}/LICENSE`) && !fs.existsSync(`${packagePath}/LICENSE.md`)) {
        fs.copyFileSync(`${__dirname}/LICENSE.md`, `${packagePath}/LICENSE.md`);
      }
      if (!fs.existsSync(`${packagePath}/.npmignore`)) {
        fs.writeFileSync(`${packagePath}/.npmignore`, `.env
.eslint*
.gitignore
package.*.json
tsconfig*
`);
      }
    }

    if (!finalPackageJson.types && fs.existsSync(`${packagePath}/index.d.ts`)) {
      if (finalPackageJson.main)
        finalPackageJson.types = finalPackageJson.main.replace('.js', '.d.ts');
      else
        finalPackageJson.types = 'index.d.ts';
    }

    if (finalPackageJson.scripts && !overridesJson.scripts) {
      for (const [key, value] of Object.entries(finalPackageJson.scripts)) {
        if (
          key.startsWith('watch') ||
          key.startsWith('build') ||
          (!finalPackageJson.private && (key.startsWith('tsc') || key.startsWith('lint')))
        ) {
          delete finalPackageJson.scripts[key];
        }
        if (key === 'prepare' && value.startsWith('husky')) delete finalPackageJson.scripts[key];
      }
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
    
    const transformPackages = x => {
      if (x.startsWith('../') && !fs.existsSync(`${buildDir}/${x.replace('/*', '')}`)) {
        return `../${x}`;
      }
      if (x.includes('/build') && !fs.existsSync(`${buildDir}/${x.replace('/*', '')}`)) {
        return `../${x}`;
      }
      return x;
    };

    if (finalPackageJson.workspaces) {
      if (Array.isArray(finalPackageJson.workspaces.packages)){
        finalPackageJson.workspaces.packages = finalPackageJson.workspaces.packages.map(transformPackages);
      } else if (Array.isArray(finalPackageJson.workspaces)) {
        finalPackageJson.workspaces = finalPackageJson.workspaces.map(transformPackages);
      }
    }
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
