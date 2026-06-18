const ERROR_CATALOG = {
  'SDD-001': {
    category: 'CONFIG',
    severity: 'HIGH',
    message: 'Required configuration is missing or invalid.',
    resolve: 'Verify all required fields in config/{repos,teams,commands}.yaml are set. Run bin/dev wf:validate.',
    retryable: false,
  },
  'SDD-002': {
    category: 'EPIC',
    severity: 'HIGH',
    message: 'Epic directory could not be resolved.',
    resolve: 'Ensure epic.md exists with a matching id field in epics/<dir>/. Check branch naming matches epic ticket ID.',
    retryable: false,
  },
  'SDD-003': {
    category: 'EPIC',
    severity: 'MEDIUM',
    message: 'Task not found in task-graph.md.',
    resolve: 'Verify the task ID exists in the epic task-graph.md frontmatter. Task IDs are integers matching delivery.yaml nodes.',
    retryable: false,
  },
  'SDD-004': {
    category: 'STATE',
    severity: 'MEDIUM',
    message: 'Invalid status transition.',
    resolve: 'Check STATUS-REFERENCE.md for valid transitions. Use `bin/sync-state.js validate-status <layer> <current> <new>` to test.',
    retryable: false,
  },
  'SDD-005': {
    category: 'STATE',
    severity: 'MEDIUM',
    message: 'Plan manifest could not be resolved.',
    resolve: 'Ensure manifest.yaml exists in agent-development/plans/<task>/ or fallback-sdd/<repo>/agent-development/plans/<task>/.',
    retryable: false,
  },
  'SDD-006': {
    category: 'INTEGRATION',
    severity: 'HIGH',
    message: 'Jira API request failed.',
    resolve: 'Check JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN secrets. Verify network connectivity and API rate limits.',
    retryable: true,
  },
  'SDD-007': {
    category: 'INTEGRATION',
    severity: 'MEDIUM',
    message: 'GitHub API request failed.',
    resolve: 'Check GITHUB_TOKEN or HUB_CROSS_REPO_TOKEN permissions. Verify rate limits at api.github.com/rate_limit.',
    retryable: true,
  },
  'SDD-008': {
    category: 'INTEGRATION',
    severity: 'LOW',
    message: 'AI verification API unavailable.',
    resolve: 'Check GitHub Models availability. Verification is advisory — this does not block PRs. Will skip gracefully.',
    retryable: true,
  },
  'SDD-009': {
    category: 'INTEGRATION',
    severity: 'MEDIUM',
    message: 'Repository dispatch event failed.',
    resolve: 'Check that the target repo has the receive-task.yml workflow on its default branch. Verify HUB_CROSS_REPO_TOKEN has repo+workflow scope.',
    retryable: true,
  },
  'SDD-010': {
    category: 'INTEGRATION',
    severity: 'HIGH',
    message: 'Repository dispatch event integrity check failed.',
    resolve: 'The HUB_INTEGRITY_TOKEN in the dispatch payload does not match the expected value. This may indicate a forged or replayed event.',
    retryable: false,
  },
  'SDD-011': {
    category: 'STATE',
    severity: 'LOW',
    message: 'Target repo PR cross-reference missing.',
    resolve: 'Add **Target repo PR:** <org>/<repo>#<number> to the PR description. Not blocking.',
    retryable: false,
  },
  'SDD-012': {
    category: 'STATE',
    severity: 'LOW',
    message: 'Hub plan PR cross-reference missing.',
    resolve: 'Add **Hub plan PR:** <org>/<hub-repo>#<number> to the PR description. Not blocking.',
    retryable: false,
  },
  'SDD-013': {
    category: 'CONFIG',
    severity: 'MEDIUM',
    message: 'Branch naming does not match configured pattern.',
    resolve: 'See config/teams.yaml → branching.branch_format. Example: feat/PROJ-123_short-description.',
    retryable: false,
  },
  'SDD-014': {
    category: 'STATE',
    severity: 'LOW',
    message: 'Blast radius exceeded — files changed outside declared plan scope.',
    resolve: 'Check manifest.yaml stage context_files and output_files. Expand scope or revert unexpected changes.',
    retryable: false,
  },
  'SDD-015': {
    category: 'CONFIG',
    severity: 'HIGH',
    message: 'Required secret or variable is not configured.',
    resolve: 'Check repository Settings → Secrets and variables → Actions. Required: HUB_CROSS_REPO_TOKEN, HUB_REPO. Optional for Jira: JIRA_BASE_URL, JIRA_API_TOKEN, JIRA_USER_EMAIL.',
    retryable: false,
  },
  'SDD-016': {
    category: 'STATE',
    severity: 'LOW',
    message: 'SDD context file not found in target repo.',
    resolve: 'The .sdd/task-context.yaml file should be created during task dispatch (.sdd/context.yaml remains a compatibility alias). If missing, add Epic ID and Task ID to the PR body manually.',
    retryable: false,
  },
  'SDD-017': {
    category: 'SYSTEM',
    severity: 'MEDIUM',
    message: 'File mutation failed — backup may be available.',
    resolve: 'Check for .bak files alongside the target file. Restore from backup and retry.',
    retryable: true,
  },
  'SDD-018': {
    category: 'SYSTEM',
    severity: 'HIGH',
    message: 'Unexpected error during automation execution.',
    resolve: 'Check workflow run logs for correlation ID. See TROUBLESHOOTING.md for common patterns.',
    retryable: true,
  },
};

const CATEGORY_COLORS = {
  CONFIG: '#6B7280',
  EPIC: '#3B82F6',
  STATE: '#F59E0B',
  INTEGRATION: '#EF4444',
  SYSTEM: '#8B5CF6',
};

class SddError extends Error {
  constructor(code, details = {}) {
    const entry = ERROR_CATALOG[code];
    const message = entry ? entry.message : `Unknown error: ${code}`;
    super(message);
    this.name = 'SddError';
    this.code = code;
    this.category = entry ? entry.category : 'SYSTEM';
    this.severity = entry ? entry.severity : 'MEDIUM';
    this.resolve = entry ? entry.resolve : 'Check workflow logs and retry.';
    this.retryable = entry ? entry.retryable : true;
    this.details = details;
    this.correlationId = details.correlation_id || null;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      code: this.code,
      category: this.category,
      severity: this.severity,
      message: this.message,
      resolve: this.resolve,
      retryable: this.retryable,
      details: this.details,
      correlation_id: this.correlationId,
      timestamp: this.timestamp,
    };
  }

  toLogEntry() {
    return {
      level: this.severity === 'HIGH' ? 'error' : this.severity === 'MEDIUM' ? 'warn' : 'info',
      ...this.toJSON(),
    };
  }
}

function lookupError(code) {
  return ERROR_CATALOG[code] || null;
}

function listErrors(category = null) {
  const entries = Object.entries(ERROR_CATALOG);
  if (category) {
    return entries.filter(([, e]) => e.category === category);
  }
  return entries;
}

function toCheckAnnotation(error) {
  const level = error.severity === 'HIGH' ? 'failure' : error.severity === 'MEDIUM' ? 'warning' : 'notice';
  return {
    path: error.details.file || 'manifest.yaml',
    start_line: error.details.line || 1,
    end_line: error.details.line || 1,
    annotation_level: level,
    message: `[${error.code}] ${error.message}`,
    title: `${error.category}: ${error.code}`,
    raw_details: error.resolve,
  };
}

module.exports = {
  ERROR_CATALOG,
  CATEGORY_COLORS,
  SddError,
  lookupError,
  listErrors,
  toCheckAnnotation,
};
