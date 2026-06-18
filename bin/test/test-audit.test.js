const {
  generateCorrelationId, createLogEntry, generateIntegrityToken,
  verifyIntegrityToken, auditWorkflowStart, auditWorkflowEnd,
  writeAuditEntry, readAuditEntries, auditSummary,
} = require('../sync-state/audit');
const fs = require('fs');
const path = require('path');

describe('audit.js — Audit trail & integrity');

it('generateCorrelationId produces unique IDs', () => {
  const id1 = generateCorrelationId();
  const id2 = generateCorrelationId();
  assert(id1 !== id2, 'correlation IDs should be unique');
  assert(id1.length > 5, 'should be reasonably long');
  assert(/^[a-z0-9]+-[a-f0-9]+$/.test(id1), 'should match pattern');
});

it('createLogEntry produces structured entry', () => {
  const entry = createLogEntry('workflow_start', {
    correlation_id: 'test-1',
    epic_id: '1',
    task_id: '3',
    source: 'plan-execution-trigger',
  });
  assertEqual(entry.event, 'workflow_start');
  assertEqual(entry.correlation_id, 'test-1');
  assertEqual(entry.epic_id, '1');
  assertEqual(entry.task_id, '3');
  assert(entry.timestamp, 'should have timestamp');
  assert(entry.status, 'should have status');
});

it('createLogEntry generates correlation ID if not provided', () => {
  const entry = createLogEntry('test_event', { source: 'test' });
  assert(entry.correlation_id, 'should auto-generate correlation ID');
});

it('writeAuditEntry and readAuditEntries roundtrip', () => {
  const tmpDir = `/tmp/sdd-audit-test-${Date.now()}`;
  fs.mkdirSync(tmpDir, { recursive: true });

  const entry = createLogEntry('test_event', {
    correlation_id: 'roundtrip-1',
    source: 'test',
    epic_id: '2',
  });

  writeAuditEntry(entry, tmpDir);

  const dateStr = entry.timestamp.slice(0, 10);
  const entries = readAuditEntries(dateStr, tmpDir);

  assert(entries.length > 0, 'should have at least 1 entry');
  assertEqual(entries[0].correlation_id, 'roundtrip-1');
  assertEqual(entries[0].event, 'test_event');

  fs.rmSync(tmpDir, { recursive: true });
});

it('auditSummary counts entries correctly', () => {
  const entries = [
    { event: 'start', status: 'started' },
    { event: 'end', status: 'success' },
    { event: 'step', status: 'failed', error: 'something broke' },
  ];
  const summary = auditSummary(entries);
  assertEqual(summary.total_entries, 3);
  assertEqual(summary.error_count, 1);
  assertEqual(summary.by_event.start, 1);
  assertEqual(summary.by_event.end, 1);
});

it('generateIntegrityToken produces consistent output', () => {
  const payload = { epic_id: '1', task_id: '3' };
  const token1 = generateIntegrityToken('secret', payload);
  const token2 = generateIntegrityToken('secret', payload);
  assertEqual(token1, token2, 'same payload + same secret = same token');
});

it('generateIntegrityToken produces different output for different payloads', () => {
  const token1 = generateIntegrityToken('secret', { epic_id: '1' });
  const token2 = generateIntegrityToken('secret', { epic_id: '2' });
  assert(token1 !== token2, 'different payloads should produce different tokens');
});

it('verifyIntegrityToken validates correctly', () => {
  const payload = { epic_id: '1', task_id: '3' };
  const token = generateIntegrityToken('secret', payload);
  assert(verifyIntegrityToken('secret', token, payload), 'valid token should pass');
});

it('verifyIntegrityToken rejects wrong secret', () => {
  const payload = { epic_id: '1' };
  const token = generateIntegrityToken('secret', payload);
  assert(!verifyIntegrityToken('wrong-secret', token, payload), 'wrong secret should fail');
});

it('verifyIntegrityToken rejects altered payload', () => {
  const token = generateIntegrityToken('secret', { epic_id: '1' });
  assert(!verifyIntegrityToken('secret', token, { epic_id: '2' }), 'altered payload should fail');
});

it('verifyIntegrityToken returns false when secret is empty', () => {
  assert(!verifyIntegrityToken('', 'any-token', {}), 'empty secret should return false');
});

it('verifyIntegrityToken returns false when token is empty', () => {
  assert(!verifyIntegrityToken('secret', '', {}), 'empty token should return false');
});

it('auditWorkflowStart writes an entry', () => {
  const tmpDir = `/tmp/sdd-audit-test-${Date.now()}`;
  fs.mkdirSync(tmpDir, { recursive: true });

  const cid = auditWorkflowStart({
    source: 'test',
    epic_id: '1',
    task_id: '3',
    projectRoot: tmpDir,
  });

  assert(cid, 'should return correlation ID');

  const dateStr = new Date().toISOString().slice(0, 10);
  const entries = readAuditEntries(dateStr, tmpDir);

  assert(entries.length > 0, 'should have entries');
  assertEqual(entries[0].event, 'workflow_start');

  fs.rmSync(tmpDir, { recursive: true });
});
