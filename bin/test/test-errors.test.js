const { SddError, lookupError, listErrors, ERROR_CATALOG } = require('../sync-state/errors');

describe('errors.js — Error taxonomy');

it('ERROR_CATALOG has 18 codes', () => {
  const codes = Object.keys(ERROR_CATALOG);
  assertEqual(codes.length, 18, `expected 18, got ${codes.length}`);
});

it('all error codes follow SDD-XXX pattern', () => {
  const codes = Object.keys(ERROR_CATALOG);
  for (const code of codes) {
    assert(/^SDD-\d{3}$/.test(code), `${code} should match SDD-NNN pattern`);
  }
});

it('all errors have required fields', () => {
  for (const [code, entry] of Object.entries(ERROR_CATALOG)) {
    assert(typeof entry.category === 'string', `${code} missing category`);
    assert(typeof entry.severity === 'string', `${code} missing severity`);
    assert(typeof entry.message === 'string', `${code} missing message`);
    assert(typeof entry.resolve === 'string', `${code} missing resolve`);
    assert(typeof entry.retryable === 'boolean', `${code} missing retryable`);
  }
});

it('SddError creates structured error objects', () => {
  const err = new SddError('SDD-001', { file: 'config.yaml', line: 5 });
  assertEqual(err.code, 'SDD-001');
  assertEqual(err.category, 'CONFIG');
  assertEqual(err.severity, 'HIGH');
  assertContains(err.message, 'configuration');
  assert(!err.retryable, 'SDD-001 should not be retryable');
  assertEqual(err.details.file, 'config.yaml');
  assertEqual(err.name, 'SddError');
});

it('SddError.toJSON returns structured payload', () => {
  const err = new SddError('SDD-004', { transition: 'done→in-progress' });
  const json = err.toJSON();
  assertEqual(json.code, 'SDD-004');
  assertEqual(json.category, 'STATE');
  assertEqual(json.severity, 'MEDIUM');
  assert(json.timestamp, 'should have timestamp');
});

it('SddError defaults to SDD-018 for unknown codes', () => {
  const err = new SddError('SDD-999');
  assertEqual(err.code, 'SDD-999');
  assertEqual(err.category, 'SYSTEM');
});

it('lookupError finds error by code', () => {
  const entry = lookupError('SDD-010');
  assert(entry !== null, 'SDD-010 should exist');
  assertEqual(entry.category, 'INTEGRATION');
});

it('lookupError returns null for unknown code', () => {
  assertEqual(lookupError('SDD-999'), null);
});

it('listErrors returns all entries', () => {
  const all = listErrors();
  assertEqual(all.length, 18);
});

it('listErrors filters by category', () => {
  const config = listErrors('CONFIG');
  assert(config.length > 0, 'should have CONFIG errors');
  for (const [, e] of config) {
    assertEqual(e.category, 'CONFIG');
  }
});

it('all 5 categories are represented', () => {
  const categories = new Set(Object.values(ERROR_CATALOG).map(e => e.category));
  assert(['CONFIG', 'EPIC', 'STATE', 'INTEGRATION', 'SYSTEM'].every(c => categories.has(c)),
    `missing categories: ${[...categories].join(', ')}`);
});
