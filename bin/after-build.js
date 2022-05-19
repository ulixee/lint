#!/usr/bin/env node

const copyWorkspaceFiles = require('../copyWorkspaceFiles');
const { readFileSync } = require('fs');
const transformPackageJsons = require('../transformPackageJsons');

const inDir = process.cwd();
const isDist = process.argv.includes('--dist');
const rootPackageJson = JSON.parse(readFileSync(`${inDir}/package.json`));
const outDir = isDist ? `${inDir}/build-dist` : `${inDir}/build`;

copyWorkspaceFiles(rootPackageJson, inDir, outDir).then(() => {
  transformPackageJsons(rootPackageJson, inDir, outDir, isDist);
});
