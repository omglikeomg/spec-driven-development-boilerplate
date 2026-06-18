'use strict';

const { generateCorrelationId, generateIntegrityToken, auditWorkflowStart, auditWorkflowEnd } = require('../sync-state/audit');
const { resolveEpicDirectory, resolvePlanManifest } = require('../sync-state/epic-resolver');
const { readTaskGraphTasks } = require('../sync-state/task-graph');
const { slugify, resolveRepoFullName, readTeamsBranchType } = require('./_shared/config');

// ---------------------------------------------------------------------------
// Re-dispatch a task that was missed on first delivery
// ---------------------------------------------------------------------------
async function replayTaskDispatch({ github, context, core }) {
  const epicId = process.env.EPIC_ID || '';
  const taskId = process.env.TASK_ID || '';
  const projectRoot = process.cwd();

  if (!epicId || !taskId) throw new Error('Both EPIC_ID and TASK_ID env vars are required.');

  const correlationId = generateCorrelationId();
  auditWorkflowStart({
    correlation_id: correlationId,
    source: 'replay-dispatch',
    epic_id: epicId,
    task_id: taskId,
    repository: context.repo.owner + '/' + context.repo.repo,
  });

  const epicDir = resolveEpicDirectory(projectRoot, epicId);
  if (!epicDir) throw new Error(`Unable to resolve epic directory for epic ${epicId}.`);

  const tasks = readTaskGraphTasks(require('path').join(epicDir, 'task-graph.md'));
  const task = tasks.find(t => String(t.id) === String(taskId));
  if (!task) throw new Error(`Unable to find task ${taskId} in task-graph.md.`);

  const planManifest = resolvePlanManifest(projectRoot, epicId, taskId);
  if (!planManifest) throw new Error(`Unable to resolve merged plan manifest for epic ${epicId} task ${taskId}.`);

  const planDir = require('path').dirname(planManifest);
  const taskSlug = slugify(task.title || `task-${taskId}`);
  const branchType = readTeamsBranchType(projectRoot);
  const executionBranch = `${branchType}/${taskId}_${taskSlug}`;

  const targetRepoFullName = resolveRepoFullName(projectRoot, String(task.repo || ''));
  if (!targetRepoFullName) throw new Error(`Unable to resolve target repo full name for ${task.repo}.`);

  const planBranchPrefix = `plan/${taskId}_`;
  let planBranch = `${planBranchPrefix}${taskSlug}`;
  let mergedPlan = null;

  // First try exact match, then fall back to any merged PR with matching task-id prefix
  const exactSearch = await github.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'closed',
    head: `${context.repo.owner}:${planBranch}`,
    per_page: 10,
  });
  mergedPlan = exactSearch.data.find(pr => pr.merged_at);

  if (!mergedPlan) {
    const allClosed = await github.paginate(github.rest.pulls.list, {
      owner: context.repo.owner,
      repo: context.repo.repo,
      state: 'closed',
      per_page: 100,
    });
    mergedPlan = allClosed.find(pr => pr.merged_at && pr.head.ref.startsWith(planBranchPrefix));
    if (mergedPlan) planBranch = mergedPlan.head.ref;
  }

  if (!mergedPlan) throw new Error(`Unable to find merged plan PR for branch prefix ${planBranchPrefix}.`);

  const payload = {
    epic_id: epicId,
    task_id: taskId,
    task_name: task.title || `Task ${taskId}`,
    hub_repo: context.repo.owner + '/' + context.repo.repo,
    plan_branch: planBranch,
    plan_pr_number: String(mergedPlan.number),
    plan_dir: planDir,
    execution_branch: executionBranch,
    correlation_id: correlationId,
  };

  const secret = process.env.HUB_INTEGRITY_SECRET || '';
  if (secret) payload.integrity_token = generateIntegrityToken(secret, payload);

  const [owner, repo] = targetRepoFullName.split('/');
  await github.rest.repos.createDispatchEvent({
    owner,
    repo,
    event_type: 'task-assigned',
    client_payload: payload,
  });

  auditWorkflowEnd(correlationId, {
    source: 'replay-dispatch',
    epic_id: epicId,
    task_id: taskId,
    repository: context.repo.owner + '/' + context.repo.repo,
  });

  core.setOutput('plan_pr_number', String(mergedPlan.number));
  core.setOutput('target_repo', targetRepoFullName);
  core.setOutput('execution_branch', executionBranch);

  console.log(`Replay dispatched → ${targetRepoFullName} branch ${executionBranch}`);
}

module.exports = { replayTaskDispatch };
