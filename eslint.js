const Path = require('path');
const Fs = require('fs');

exports.monorepo = function (packageJsonRootDir) {
  const workspaces = [];
  const workspacesWithModules = ['node_modules'];
  const pkg = JSON.parse(Fs.readFileSync(`${packageJsonRootDir}/package.json`));
  const packages = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages ?? [];
  for (const workspaceDir of packages || []) {
    if (workspaceDir.includes('/build')) continue;

    const workspace = workspaceDir.replace('/*', '');
    workspaces.push(workspace);
    workspacesWithModules.push(workspace);
    workspacesWithModules.push(`${workspace}/node_modules`);
    if (workspaceDir.endsWith('/*')) {
      const baseDir = `${packageJsonRootDir}/${workspace}`;
      for (const sub of Fs.readdirSync(baseDir)) {
        if (Fs.lstatSync(`${baseDir}/${sub}`).isDirectory()) {
          workspaces.push(`${workspace}/${sub}`);
          workspacesWithModules.push(`${workspace}/${sub}`);
          workspacesWithModules.push(`${workspace}/${sub}/node_modules`);
        }
      }
    }
  }
  return {
    root: true,
    extends: [
      'airbnb-base',
      'airbnb-typescript/base',
      'plugin:@typescript-eslint/recommended',
      'plugin:eslint-comments/recommended',
      'plugin:jest/recommended',
      'plugin:promise/recommended',
      'prettier',
      'plugin:monorepo-cop/recommended',
      'plugin:import/errors',
      'plugin:import/warnings',
      'plugin:import/typescript',
    ],
    plugins: ['monorepo-cop'],
    parserOptions: {
      project: Path.join(packageJsonRootDir, 'tsconfig.json'),
      extraFileExtensions: ['.mjs'],
    },
    settings: {
      'import/external-module-folders': workspacesWithModules,
      'import/resolver': {
        typescript: {
          project: ['tsconfig.json'],
        },
      },
    },
    env: {
      node: true,
      es6: true,
      browser: true,
      jest: true,
    },
    overrides: [
      {
        files: ['global.d.ts'],
        rules: {
          '@typescript-eslint/no-unused-vars': 'off',
        },
      },
      {
        files: [
          '**/injected-scripts/**/*.js',
          '**/injected-scripts/**/*.ts',
          '**/injected-scripts/*',
        ],
        rules: {
          'no-console': 'off',
          'no-undef': 'off',
          'prefer-rest-params': 'off',
          'max-classes-per-file': 'off',
          'func-names': 'off',
          '@typescript-eslint/no-unused-vars': 'off',
          '@typescript-eslint/explicit-function-return-type': 'off',
        },
      },
      {
        files: '**/examples/**',
        rules: {
          'no-undef': 'off',
          'no-console': 'off',
          '@typescript-eslint/no-unused-vars': 'off',
          'import/no-extraneous-dependencies': 'off',
          '@typescript-eslint/no-floating-promises': 'off',
          '@typescript-eslint/explicit-function-return-type': 'off',
        },
      },
      {
        files: ['**/test/*.ts', '**/test/**/*', '**/testing/*'],
        rules: {
          'max-classes-per-file': 'off',
          'promise/valid-params': 'off',
          'no-console': 'off',
          'func-names': 'off',
          '@typescript-eslint/explicit-function-return-type': 'off',
          '@typescript-eslint/no-unused-vars': 'off',
        },
      },
      {
        files: ['**/*.js', '**/docs/**'],
        rules: {
          '@typescript-eslint/explicit-function-return-type': 'off',
        },
      },
      {
        files: [
          '**/install*',
          '**/installer/index*',
          '**/*Install*',
          '**/prepare-*.js',
          '**/scripts/*.ts',
          '**/data-scripts/*.ts',
        ],
        rules: {
          'no-console': 'off',
        },
      },
    ],
    ignorePatterns: [
      'node_modules',
      '**/test/assets/**',
      'build',
      'build-dist',
      '**/babel.config.js',
      '**/vue.config.js',
      '**/prepare-*.js',
      '**/copyfiles.js',
      'versionCheck.ts',
      './*.js',
      '**/examples',
      '**/build/**',
      '**/dist/**',
      '**/*.md',
      '**/*.d.ts',
    ],
    rules: {
      'import/no-named-as-default': 'off',
      'import/no-import-module-exports': 'off',
      'import/prefer-default-export': 'off',
      'import/no-cycle': 'off',
      'import/namespace': 'off',
      'import/extensions': 'off',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.d.ts',
            '**/**/test/**',
            '**/examples/**',
            '**/scripts/**',
            '**/data-scripts/**',
            '**/*.test.ts',
          ],
        },
      ],
      'no-use-before-define': 'off', // use typescript one
      'no-prototype-builtins': 'off',
      'no-case-declarations': 'off',
      'no-parameter-reassignment': 'off',
      'array-type': 'off',
      'import-name': 'off',
      'default-case': 'off',
      'no-new': 'off',
      'no-empty': 'off',
      'no-continue': 'off',
      'global-require': 'off', // use import rule instead
      'no-promise-executor-return': 'off',
      'no-void': 'off',
      'no-bitwise': 'off',
      'no-useless-return': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-async-promise-executor': 'off',
      'no-return-await': 'off',
      'no-plusplus': 'off',
      'no-return-assign': 'off',
      'prefer-destructuring': 'off',
      'no-await-in-loop': 'off',
      'no-restricted-syntax': 'off',
      'no-param-reassign': 'off',
      'no-underscore-dangle': 'off',
      'class-methods-use-this': 'off',
      'consistent-return': ['off', { treatUndefinedAsUnspecified: true }],
      'spaced-comment': ['error', 'always', { markers: ['/', '/////'] }],
      'require-await': 'off', // duplicated with ts version
      'arrow-body-style': 'off',
      'jest/no-conditional-expect': 'off',
      '@typescript-eslint/semi': 'warn',
      '@typescript-eslint/no-implied-eval': 'off', // false positives for setTimeout with bind fn
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/space-before-function-paren': 'off',
      '@typescript-eslint/object-literal-sort-keys': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/ordered-imports': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-shadow': [
        'error',
        {
          ignoreTypeValueShadow: true,
          ignoreFunctionTypeParameterNameValueShadow: true,
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          modifiers: ['unused'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'parameter',
          format: ['camelCase', 'PascalCase'],
          modifiers: ['unused'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/object-literal-shorthand': 'off',
      '@typescript-eslint/object-shorthand-properties-first': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowHigherOrderFunctions: true },
      ],
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/lines-between-class-members': [
        'error',
        'always',
        { exceptAfterSingleLine: true },
      ],
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'private-field',
            'constructor',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
            'public-static-method',
            'protected-static-method',
            'private-static-method',
          ],
        },
      ],
    },
  };
};
