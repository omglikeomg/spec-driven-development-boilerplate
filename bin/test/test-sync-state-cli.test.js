const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('sync-state.js — CLI commands');

const SYNC_STATE = path.join(__dirname, '..', 'sync-state.js');
const TMP_DIR = `/tmp/sdd-cli-test-${Date.now()}`;

function runSyncState(...args) {
  try {
    const output = execFileSync('node', [SYNC_STATE, ...args], {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..', '..'),
      timeout: 10000,
      stdio: 'pipe',
    });
    return { success: true, output: output.trim(), exitCode: 0 };
  } catch (err) {
    const out = [err.stdout, err.stderr].filter(Boolean).join('').trim();
    return { success: false, output: out, exitCode: err.status || 1 };
  }
}

it('validate-status passes for valid transition', () => {
  const result = runSyncState('validate-status', 'task', 'in-progress', 'done');
  assert(result.success, `should pass: ${result.output}`);
  assertContains(result.output, 'valid');
  assertContains(result.output, 'true');
});

it('validate-status fails for invalid transition', () => {
  const result = runSyncState('validate-status', 'task', 'done', 'in-progress');
  assert(!result.success, 'should fail for terminal status');
  assertContains(result.output, 'terminal');
});

it('validate-status fails for unknown layer', () => {
  const result = runSyncState('validate-status', 'nonexistent', 'foo', 'bar');
  assert(!result.success, 'should fail for unknown layer');
});

it('list-errors returns all 18 codes', () => {
  const result = runSyncState('list-errors');
  assert(result.success, 'should succeed');
  const parsed = JSON.parse(result.output);
  assertEqual(Object.keys(parsed).length, 18);
});

it('list-errors filters by category', () => {
  const result = runSyncState('list-errors', 'CONFIG');
  assert(result.success, 'should succeed');
  const parsed = JSON.parse(result.output);
  assert(Object.keys(parsed).length > 0);
  for (const code of Object.keys(parsed)) {
    assertEqual(parsed[code].category, 'CONFIG');
  }
});

it('help displays usage on any unknown arg', () => {
  const result = runSyncState('help');
  assert(!result.success, 'help falls through to usage which exits 1');
  assertContains(result.output, 'Usage:');
});

it('no args displays usage', () => {
  const result = runSyncState();
  assert(!result.success, 'no args falls through to usage which exits 1');
  assertContains(result.output, 'Usage:');
});

it('unknown command exits 1', () => {
  const result = runSyncState('nonexistent-command');
  assert(!result.success, 'should fail');
});

it('checklist command validates a manifest', () => {
  const tmpFile = `/tmp/sdd-test-manifest-cli-${Date.now()}.yaml`;
  fs.writeFileSync(tmpFile, 'checklist:\n  CHK-001:\n    description: "Tests pass"\n    verified: true\n');
  const result = runSyncState('checklist', tmpFile);
  assert(result.success, 'should pass with all verified');
  const parsed = JSON.parse(result.output);
  assert(parsed.passed, 'checklist should pass');
  fs.unlinkSync(tmpFile);
});

it('checklist command fails on incomplete', () => {
  const tmpFile = `/tmp/sdd-test-manifest-cli-${Date.now()}.yaml`;
  fs.writeFileSync(tmpFile, 'checklist:\n  CHK-001:\n    description: "Tests pass"\n    verified: false\n');
  const result = runSyncState('checklist', tmpFile);
  assert(!result.success, 'should fail with unverified items');
  fs.unlinkSync(tmpFile);
});

it('analyze detects missing epic', () => {
  const result = runSyncState('analyze', 'no-such-epic-999');
  const parsed = JSON.parse(result.output);
  assert(!parsed.passed, 'should fail for missing epic');
  assertEqual(parsed.issue_count, 1);
});

it('preflight detects missing secrets in local env', () => {
  const result = runSyncState('preflight');
  const parsed = JSON.parse(result.output);
  assert(parsed.issue_count > 0, 'should detect missing HUB_CROSS_REPO_TOKEN locally');
});

it('update-manifest modifies a manifest file', () => {
  const tmpFile = `/tmp/sdd-test-manifest-${Date.now()}.yaml`;
  fs.writeFileSync(tmpFile, 'name: old\nversion: 1\n');
  const result = runSyncState('update-manifest', tmpFile, 'name', 'new');
  assert(result.success, 'should succeed');
  const updated = fs.readFileSync(tmpFile, 'utf8');
  assertContains(updated, 'name: new');
  assertContains(updated, 'version: 1');
  fs.unlinkSync(tmpFile);
});
