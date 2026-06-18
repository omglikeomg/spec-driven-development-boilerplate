const fs = require('fs');
const path = require('path');
const { generateCorrelationId, auditWorkflowStart, auditWorkflowEnd, generateIntegrityToken } = require('../sync-state/audit');
const { readFrontmatterField, resolveEpicDirectory } = require('../sync-state/epic-resolver');
const { checkPendingMarkers, resolveDependencies, formatPendingError, formatDependencyError } = require('../sync-state/validators');
const { slugify, resolveRepoFullName, readTeamsBranchType, resolveSddMode } = require('./_shared/config');

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '_templates') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(full);
      walk(full, results);
    }
  }
  return results;
}

async function generateCorrelationStep({ context, core }) {
  const cid = generateCorrelationId();
  auditWorkflowStart({
    correlation_id: cid,
    source: 'plan-execution-trigger',
    epic_id: null,
    task_id: null,
    repository: `${context.repo.owner}/${context.repo.repo}`,
  });
  core.setOutput('correlation_id', cid);
}

async function discoverPlanContext({ context, core }) {
  const branchRef = context.payload.pull_request?.head?.ref
    || process.env.INPUT_PLAN_BRANCH
    || context.payload.inputs?.plan_branch
    || '';
  const branchBody = branchRef.replace(/^plan\//, '');
  const branchSlug = branchBody.includes('_') ? branchBody.slice(branchBody.indexOf('_') + 1) : branchBody;

  const roots = ['agent-development/plans', 'fallback-sdd', 'repos'];
  let found = null;

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of walk(root)) {
      const manifest = path.join(dir, 'manifest.yaml');
      if (!fs.existsSync(manifest)) continue;
      const taskName = readFrontmatterField(manifest, 'task_name') || '';
      const taskId = readFrontmatterField(manifest, 'task_id');
      const epicId = readFrontmatterField(manifest, 'epic_id');
      const targetRepo = readFrontmatterField(manifest, 'target_repo');
      const dirSlug = path.basename(dir);
      if (
        slugify(dirSlug).includes(slugify(branchSlug)) ||
        slugify(branchSlug).includes(slugify(dirSlug)) ||
        slugify(taskName).includes(slugify(branchSlug))
      ) {
        found = { manifest, planDir: dir, taskId, epicId, targetRepo, taskName };
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    throw new Error(`Unable to resolve plan manifest for branch ${branchRef}`);
  }

  const targetRepoFullName = resolveRepoFullName(process.cwd(), found.targetRepo);
  if (!targetRepoFullName) {
    throw new Error(`Unable to resolve git URL for target repo ${found.targetRepo}`);
  }

  const branchType = readTeamsBranchType(process.cwd());
  const sddMode = resolveSddMode(process.cwd(), found.targetRepo);
  const executionBranch = `${branchType}/${found.taskId}_${branchSlug}`;

  core.setOutput('branch_type', branchType);
  core.setOutput('has_own_sdd', String(sddMode.hasOwnSdd));
  core.setOutput('branch_ref', branchRef);
  core.setOutput('plan_dir', found.planDir);
  core.setOutput('manifest_path', found.manifest);
  core.setOutput('task_id', found.taskId);
  core.setOutput('epic_id', found.epicId);
  core.setOutput('target_repo_key', found.targetRepo);
  core.setOutput('target_repo_full_name', targetRepoFullName);
  core.setOutput('task_name', found.taskName);
  core.setOutput('execution_branch', executionBranch);
}

async function validatePlanForSafetyGates({ core, inputs = {} }) {
  const planDir = inputs.planDir || process.env.PLAN_DIR || '';
  const epicId = inputs.epicId || process.env.EPIC_ID || '';
  const taskId = inputs.taskId || process.env.TASK_ID || '';
  const epicDir = resolveEpicDirectory(process.cwd(), epicId);
  if (!epicDir) {
    core.setFailed(`Unable to resolve epic directory for epic ${epicId}`);
    return;
  }

  const specPath = path.join(planDir, 'specification.md');
  const pendingCheck = checkPendingMarkers(specPath);
  if (pendingCheck.hasPending) {
    core.warning(`⚠️  Found ${pendingCheck.count} PENDING marker(s) in specification`);
    console.log(formatPendingError(pendingCheck.markers));
    core.setOutput('has_pending', 'true');
  } else {
    core.setOutput('has_pending', 'false');
  }

  const depsCheck = resolveDependencies(epicDir, taskId);
  if (!depsCheck.allDone && depsCheck.blockedBy.length > 0) {
    core.error(formatDependencyError(depsCheck.blockedBy));
    core.setFailed(`Task is blocked by: ${depsCheck.blockedBy.join(', ')}`);
  } else {
    core.setOutput('dependencies_ok', 'true');
  }
}

async function generateQualityChecklist({ inputs = {} }) {
  const manifestPath = inputs.manifestPath || process.env.MANIFEST_PATH || '';
  const taskName = inputs.taskName || process.env.TASK_NAME || '';

  if (!manifestPath || !fs.existsSync(manifestPath)) {
    console.log('Manifest not found. Skipping checklist generation.');
    return;
  }

  const manifestText = fs.readFileSync(manifestPath, 'utf8');
  if (manifestText.includes('checklist:')) {
    console.log('Checklist already exists. Skipping.');
    return;
  }

  const checklist = [
    { id: 'CHK-001', description: 'All plan stages have verified successfully' },
    { id: 'CHK-002', description: 'Tests pass (bin/dev verify:full)' },
    { id: 'CHK-003', description: 'No lint warnings remain (bin/dev lint)' },
    { id: 'CHK-004', description: 'Architecture docs updated if this change affects system design' },
    { id: 'CHK-005', description: 'Blast radius matches declared scope in manifest' },
  ];

  if (taskName && taskName.toLowerCase().includes('api')) {
    checklist.push({ id: 'CHK-006', description: 'API contract updated in contracts/ directory' });
  }
  if (taskName && taskName.toLowerCase().includes('ui')) {
    checklist.push({ id: 'CHK-007', description: 'Manual testing completed in supported browsers' });
  }

  const checklistYaml = checklist.map((c) => `      ${c.id}:\n        description: "${c.description}"\n        verified: false`).join('\n');
  const checklistBlock = `  checklist:\n${checklistYaml}`;
  const updated = manifestText.replace(/\n(?=\S)/, `\n${checklistBlock}\n`);
  fs.writeFileSync(manifestPath, updated);
  console.log('Checklist injected into manifest.');
}

async function dispatchTaskToTargetRepo({ github, context, inputs = {} }) {
  const targetRepoFullName = inputs.targetRepoFullName || process.env.TARGET_REPO_FULL_NAME || '';
  const [owner, repo] = targetRepoFullName.split('/');
  const cid = inputs.correlationId || process.env.CORRELATION_ID || '';
  const payload = {
    epic_id: inputs.epicId || process.env.EPIC_ID || '',
    task_id: inputs.taskId || process.env.TASK_ID || '',
    task_name: inputs.taskName || process.env.TASK_NAME || '',
    hub_repo: `${context.repo.owner}/${context.repo.repo}`,
    plan_branch: inputs.planBranch || process.env.PLAN_BRANCH || '',
    plan_pr_number: Number(inputs.planPrNumber || process.env.PLAN_PR_NUMBER || 0),
    plan_dir: inputs.planDir || process.env.PLAN_DIR || '',
    execution_branch: inputs.executionBranch || process.env.EXECUTION_BRANCH || '',
    correlation_id: cid,
  };

  payload.integrity_token = generateIntegrityToken(process.env.HUB_INTEGRITY_SECRET || '', payload);

  await github.rest.repos.createDispatchEvent({
    owner,
    repo,
    event_type: 'task-assigned',
    client_payload: payload,
  });
}

async function commentOnPlan({ github, context, inputs = {} }) {
  const prNumber = Number(
    inputs.prNumber || process.env.PLAN_PR_NUMBER ||
    context.payload.pull_request?.number || 0
  );
  if (!prNumber) {
    console.log('No PR number available; skipping plan dispatch comment.');
    return;
  }
  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    body: [
      'Plan approved and dispatched.',
      '',
      `**Task:** ${inputs.taskId || process.env.TASK_ID || ''} - ${inputs.taskName || process.env.TASK_NAME || ''}`,
      `**Target repo:** ${inputs.targetRepoFullName || process.env.TARGET_REPO_FULL_NAME || ''}`,
      `**Execution branch:** ${inputs.executionBranch || process.env.EXECUTION_BRANCH || ''}`,
      `**Child repo dispatch:** sent`,
      `**Correlation ID:** \`${inputs.correlationId || process.env.CORRELATION_ID || ''}\``,
    ].join('\n'),
  });
}

async function endAudit({ inputs = {}, jobStatus }) {
  auditWorkflowEnd(inputs.correlationId || process.env.CORRELATION_ID || '', {
    source: 'plan-execution-trigger',
    epic_id: inputs.epicId || process.env.EPIC_ID || '',
    task_id: inputs.taskId || process.env.TASK_ID || '',
    repository: process.env.GITHUB_REPOSITORY || null,
    error: jobStatus === 'failure' ? 'workflow_failed' : null,
  });
}

module.exports = {
  generateCorrelationStep,
  discoverPlanContext,
  validatePlanForSafetyGates,
  generateQualityChecklist,
  dispatchTaskToTargetRepo,
  commentOnPlan,
  endAudit,
};
