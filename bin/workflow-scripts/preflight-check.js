'use strict';

const fs = require('fs');
const path = require('path');
const { detectSddContext } = require('./_shared/sdd');
const { SddError, toCheckAnnotation } = require('../sync-state/errors');

// ---------------------------------------------------------------------------
// detect-sdd job: determine whether this PR is SDD-managed
// Shares the same logic as pr-lifecycle.js (DRY via _shared/sdd.js)
// ---------------------------------------------------------------------------
function detectSddPR({ context, core }) {
  const branch = context.payload.pull_request.head.ref;
  const body = context.payload.pull_request.body || '';
  const { isSdd } = detectSddContext(branch, body);
  core.setOutput('is_sdd', String(isSdd));
}

// ---------------------------------------------------------------------------
// config job: validate config files and post a check run
// ---------------------------------------------------------------------------
async function validateConfigFiles({ github, context, core, inputs = {} }) {
  const isSdd = inputs.isSdd === 'true' || process.env.IS_SDD === 'true';
  const annotations = [];
  const errors = [];

  const requiredFiles = [
    { path: 'config/repos.yaml', description: 'Repository registry' },
    { path: 'config/teams.yaml', description: 'Team configuration' },
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file.path)) {
      const err = new SddError('SDD-001', { file: file.path, correlation_id: process.env.GITHUB_RUN_ID || '' });
      annotations.push(toCheckAnnotation(err));
      errors.push(`Missing required file: ${file.path} (${file.description})`);
    }
  }

  if (fs.existsSync('config/repos.yaml')) {
    const text = fs.readFileSync('config/repos.yaml', 'utf8');
    if (!text.includes('repositories:') && !text.includes('repos:')) {
      const err = new SddError('SDD-001', { file: 'config/repos.yaml', line: 1 });
      annotations.push(toCheckAnnotation(err));
      errors.push('config/repos.yaml: missing top-level "repositories" key');
    }
  }

  if (fs.existsSync('config/teams.yaml')) {
    const text = fs.readFileSync('config/teams.yaml', 'utf8');
    for (const [field, msg] of [
      ['active_team:', 'missing "active_team" field'],
      ['project_key:', 'missing Jira "project_key" — Jira integration will be skipped'],
      ['branching:', 'missing "branching" section'],
    ]) {
      if (!text.includes(field)) {
        const err = new SddError('SDD-001', { file: 'config/teams.yaml', line: 1 });
        annotations.push(toCheckAnnotation(err));
        errors.push(`config/teams.yaml: ${msg}`);
      }
    }
  }

  const pr = context.payload.pull_request;
  const branch = pr.head.ref;

  if (isSdd) {
    const execPrefixes = ['feat/', 'fix/', 'chore/', 'hotfix/', 'refactor/', 'docs/', 'ci/'];

    if (branch.startsWith('plan/') && !/\*\*Target repo PR:\*\*/.test(pr.body || '')) {
      annotations.push(toCheckAnnotation(new SddError('SDD-011', { file: 'PR description', line: 1 })));
    }

    if (execPrefixes.some(p => branch.startsWith(p))) {
      if (!/\*\*Hub plan PR:\*\*/.test(pr.body || '')) {
        annotations.push(toCheckAnnotation(new SddError('SDD-012', { file: 'PR description', line: 1 })));
      }
    }

    const validPrefixes = ['epic/', 'plan/', ...execPrefixes, 'main', 'master'];
    const hasValidPrefix = validPrefixes.some(p => branch.startsWith(p) || branch === p);
    if (!hasValidPrefix && branch !== context.payload.repository?.default_branch) {
      annotations.push(toCheckAnnotation(new SddError('SDD-013', { file: 'branch', line: 1 })));
    }
  }

  const conclusion = errors.length > 0 ? 'neutral' : 'success';
  const title = errors.length > 0 ? `${errors.length} preflight issue(s) found` : 'Preflight checks passed';
  const summary = errors.length > 0
    ? errors.map(e => `- ${e}`).join('\n')
    : 'All config files, branch naming, and PR metadata look valid.';

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'SDD Preflight',
    head_sha: pr.head.sha,
    status: 'completed',
    conclusion: isSdd ? conclusion : 'success',
    output: {
      title: isSdd ? title : 'Preflight skipped (non-SDD PR)',
      summary: isSdd ? summary : 'Branch is not an SDD-managed branch. Config and schema checks still apply.',
      annotations: annotations.slice(0, 50),
    },
  });
}

// ---------------------------------------------------------------------------
// secrets job: check required secrets and post a check run
// ---------------------------------------------------------------------------
async function checkRequiredSecrets({ github, context, core }) {
  const pr = context.payload.pull_request;
  const missingSecrets = [];
  const missingVars = [];

  const secretCheck = (name, value, required) => {
    if (required && !value) missingSecrets.push(name);
  };
  const varCheck = (name, value, required) => {
    if (required && (!value || value === '')) missingVars.push(name);
  };

  secretCheck('HUB_CROSS_REPO_TOKEN', process.env.HUB_CROSS_REPO_TOKEN, true);
  secretCheck('JIRA_BASE_URL', process.env.JIRA_BASE_URL, false);
  secretCheck('JIRA_API_TOKEN', process.env.JIRA_API_TOKEN, false);
  secretCheck('JIRA_USER_EMAIL', process.env.JIRA_USER_EMAIL, false);
  varCheck('HUB_REPO', process.env.HUB_REPO, true);

  const issues = [
    missingSecrets.length ? `Missing required secrets: ${missingSecrets.join(', ')}` : null,
    missingVars.length ? `Missing required variables: ${missingVars.join(', ')}` : null,
  ].filter(Boolean);

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'SDD Secrets Check',
    head_sha: pr.head.sha,
    status: 'completed',
    conclusion: issues.length > 0 ? 'neutral' : 'success',
    output: {
      title: issues.length > 0 ? `${issues.length} secret/variable issue(s)` : 'Secrets configured',
      summary: issues.length > 0
        ? issues.join('\n') + '\n\n_This is advisory. Automation will skip features requiring missing secrets._'
        : 'Required secrets and variables are available in this repository.',
    },
  });
}

module.exports = {
  detectSddPR,
  validateConfigFiles,
  checkRequiredSecrets,
};
