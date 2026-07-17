#!/usr/bin/env node
// node --test's built-in glob support for CLI file arguments is version-dependent
// (works on Node 22, not Node 20), so we resolve the file list ourselves instead
// of passing a glob string straight through.
const { execFileSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const path = require('node:path');

const srcDir = path.join(__dirname, '..', 'src');

const testFiles = readdirSync(srcDir, { recursive: true })
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => path.join('src', file));

if (testFiles.length === 0) {
  console.error('No test files found under backend/src');
  process.exit(1);
}

execFileSync(
  process.execPath,
  ['--test', '-r', 'ts-node/register', ...testFiles],
  { stdio: 'inherit' }
);
