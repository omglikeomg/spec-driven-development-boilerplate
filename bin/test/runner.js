#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TEST_DIR = __dirname;
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function describe(label) {
  process.stdout.write(`\n${label}\n`);
}

function it(label, fn) {
  try {
    fn();
    passed += 1;
    process.stdout.write(`  ✓ ${label}\n`);
  } catch (err) {
    failed += 1;
    process.stdout.write(`  ✗ ${label}\n    ${err.message}\n`);
    failures.push({ label, error: err.message });
  }
}

function skip(label) {
  skipped += 1;
  process.stdout.write(`  - ${label} (skipped)\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(message || `expected ${b}, got ${a}`);
  }
}

function assertContains(actual, substr, message) {
  if (!actual.includes(substr)) {
    throw new Error(message || `expected "${actual}" to contain "${substr}"`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(message || 'expected function to throw');
  } catch (err) {
    if (err.message === message) throw err;
  }
}

global.describe = describe;
global.it = it;
global.skip = skip;
global.assert = assert;
global.assertEqual = assertEqual;
global.assertDeepEqual = assertDeepEqual;
global.assertContains = assertContains;
global.assertThrows = assertThrows;

const testFiles = fs.readdirSync(TEST_DIR)
  .filter(f => f.startsWith('test-') && f.endsWith('.test.js'))
  .sort();

for (const file of testFiles) {
  const fullPath = path.join(TEST_DIR, file);
  try {
    require(fullPath);
  } catch (err) {
    failed += 1;
    process.stdout.write(`\n  ✗ Failed to load ${file}: ${err.message}\n`);
    failures.push({ label: file, error: err.message });
  }
}

process.stdout.write(`\n${'─'.repeat(50)}\n`);
process.stdout.write(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

if (failures.length > 0) {
  process.stdout.write('\nFailures:\n');
  for (const f of failures) {
    process.stdout.write(`  - ${f.label}: ${f.error}\n`);
  }
}

process.exit(failed > 0 ? 1 : 0);
