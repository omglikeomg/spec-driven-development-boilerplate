const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIT_LOG_DIR = '.sdd-audit';
const CORRELATION_ID_HEADER = 'X-SDD-Correlation-Id';
const EVENT_INTEGRITY_FIELD = 'integrity_token';

function generateCorrelationId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
}

function createLogEntry(event, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    correlation_id: data.correlation_id || generateCorrelationId(),
    event,
    source: data.source || 'unknown',
    epic_id: data.epic_id || null,
    task_id: data.task_id || null,
    actor: data.actor || process.env.GITHUB_ACTOR || process.env.USER || 'automation',
    run_id: process.env.GITHUB_RUN_ID || null,
    run_number: process.env.GITHUB_RUN_NUMBER || null,
    repository: process.env.GITHUB_REPOSITORY || data.repository || null,
    status: data.status || 'info',
    duration_ms: data.duration_ms || null,
    error: data.error || null,
    metadata: data.metadata || {},
  };
}

function writeAuditEntry(entry, projectRoot = process.cwd()) {
  const auditDir = path.join(projectRoot, AUDIT_LOG_DIR);
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  const datePart = entry.timestamp.slice(0, 10);
  const logFile = path.join(auditDir, `sdd-audit-${datePart}.jsonl`);

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logFile, line, 'utf8');
}

function readAuditEntries(dateStr, projectRoot = process.cwd()) {
  const logFile = path.join(projectRoot, AUDIT_LOG_DIR, `sdd-audit-${dateStr}.jsonl`);
  if (!fs.existsSync(logFile)) {
    return [];
  }
  const text = fs.readFileSync(logFile, 'utf8');
  return text.trim().split('\n').filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function queryByCorrelationId(correlationId, dateStr, projectRoot = process.cwd()) {
  const entries = readAuditEntries(dateStr, projectRoot);
  return entries.filter((e) => e.correlation_id === correlationId);
}

function queryByEpic(epicId, dateStr, projectRoot = process.cwd()) {
  const entries = readAuditEntries(dateStr, projectRoot);
  return entries.filter((e) => e.epic_id === epicId);
}

function generateIntegrityToken(secret, payload = {}) {
  const hmac = crypto.createHmac('sha256', String(secret));
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

function verifyIntegrityToken(secret, token, payload = {}) {
  if (!secret || !token) {
    return false;
  }
  const expected = generateIntegrityToken(secret, payload);
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(String(token))
  );
}

function auditSummary(entries) {
  const total = entries.length;
  const byStatus = {};
  const byEvent = {};
  const errors = [];

  for (const entry of entries) {
    byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    byEvent[entry.event] = (byEvent[entry.event] || 0) + 1;
    if (entry.error) {
      errors.push(entry.error);
    }
  }

  return {
    total_entries: total,
    by_status: byStatus,
    by_event: byEvent,
    error_count: errors.length,
    errors,
    first_entry: entries[0]?.timestamp || null,
    last_entry: entries[total - 1]?.timestamp || null,
  };
}

function auditWorkflowStart(data = {}) {
  const entry = createLogEntry('workflow_start', {
    ...data,
    status: 'started',
  });
  const projectRoot = data.projectRoot || process.cwd();
  writeAuditEntry(entry, projectRoot);
  return entry.correlation_id;
}

function auditWorkflowEnd(correlationId, data = {}) {
  const entry = createLogEntry('workflow_end', {
    ...data,
    correlation_id: correlationId,
    status: data.error ? 'failed' : 'success',
  });
  const projectRoot = data.projectRoot || process.cwd();
  writeAuditEntry(entry, projectRoot);
  return entry;
}

function auditStep(correlationId, stepName, data = {}) {
  const entry = createLogEntry(`step_${stepName}`, {
    ...data,
    correlation_id: correlationId,
    status: data.error ? 'failed' : 'completed',
  });
  const projectRoot = data.projectRoot || process.cwd();
  writeAuditEntry(entry, projectRoot);
  return entry;
}

module.exports = {
  AUDIT_LOG_DIR,
  CORRELATION_ID_HEADER,
  EVENT_INTEGRITY_FIELD,
  generateCorrelationId,
  createLogEntry,
  writeAuditEntry,
  readAuditEntries,
  queryByCorrelationId,
  queryByEpic,
  generateIntegrityToken,
  verifyIntegrityToken,
  auditSummary,
  auditWorkflowStart,
  auditWorkflowEnd,
  auditStep,
};
