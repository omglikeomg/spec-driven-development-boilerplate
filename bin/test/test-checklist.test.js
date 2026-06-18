const { parseManifestChecklist, validateChecklist } = require('../sync-state/checklist');
const fs = require('fs');

describe('checklist.js — Checklist parsing & validation');

function writeTempManifest(content) {
  const file = `/tmp/sdd-test-manifest-${Date.now()}.yaml`;
  fs.writeFileSync(file, content);
  return file;
}

it('parseManifestChecklist returns null for missing file', () => {
  assertEqual(parseManifestChecklist('/tmp/nonexistent.yaml'), null);
});

it('parseManifestChecklist parses a complete checklist', () => {
  const content = 'checklist:\n  CHK-001:\n    description: "Tests pass"\n    verified: true\n  CHK-002:\n    description: "Lint clean"\n    verified: false\n';
  const file = writeTempManifest(content);
  const result = parseManifestChecklist(file);
  assert(result !== null, 'should parse');
  assertEqual(result.total, 2);
  assertEqual(result.verified, 1);
  assertEqual(result.percent, 50);
  assert(!result.all_verified, 'one unverified item');
  assertDeepEqual(result.unchecked, ['Lint clean']);
  fs.unlinkSync(file);
});

it('parseManifestChecklist returns empty for no checklist', () => {
  const content = 'name: test\nversion: 1\n';
  const file = writeTempManifest(content);
  const result = parseManifestChecklist(file);
  assertEqual(result.total, 0);
  assertEqual(result.verified, 0);
  assertEqual(result.all_verified, true);
  fs.unlinkSync(file);
});

it('validateChecklist passes when all items verified', () => {
  const content = 'checklist:\n  CHK-001:\n    description: "Tests pass"\n    verified: true\n  CHK-002:\n    description: "Lint clean"\n    verified: true\n';
  const file = writeTempManifest(content);
  const result = validateChecklist(file);
  assert(result.passed, 'should pass when all verified');
  assertEqual(result.checklist.percent, 100);
  assert(result.checklist.all_verified);
  fs.unlinkSync(file);
});

it('validateChecklist fails when items unverified', () => {
  const content = 'checklist:\n  CHK-001:\n    description: "Tests pass"\n    verified: true\n  CHK-002:\n    description: "Lint clean"\n    verified: false\n';
  const file = writeTempManifest(content);
  const result = validateChecklist(file);
  assert(!result.passed, 'should fail with unverified items');
  assertContains(result.reason, '1 checklist');
  fs.unlinkSync(file);
});

it('validateChecklist fails when no checklist exists', () => {
  const content = 'name: test\n';
  const file = writeTempManifest(content);
  const result = validateChecklist(file);
  assert(!result.passed);
  assertContains(result.reason, 'No checklist items');
  fs.unlinkSync(file);
});

it('validateChecklist fails for missing file', () => {
  const result = validateChecklist('/tmp/nonexistent.yaml');
  assert(!result.passed);
  assertContains(result.reason, 'Manifest not found');
});
