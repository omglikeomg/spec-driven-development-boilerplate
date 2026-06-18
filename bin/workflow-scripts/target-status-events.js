'use strict';

const { execFileSync } = require('child_process');
const { isValidTransition } = require('../sync-state/status-validator');
const { getTaskById, getDeliveryNodeById, checkEpicCompletion } = require('../sync-state/epic-resolver');
const { generateCorrelationId, auditWorkflowStart, auditWorkflowEnd } = require('../sync-state/audit');

// ---------------------------------------------------------------------------
// Validate and apply a delivery/task status change dispatched from a target repo
// ---------------------------------------------------------------------------
async function validateAndApplyStatusChange({ github, context, core }) {
  const payload = context.payload.client_payload || {};
  const eventType = context.payload.action || 'pr-status-change';
  const correlationId = String(payload.correlation_id || generateCorrelationId());

  const epicId = String(payload.epic_id || '');
  const taskId = String(payload.task_id || '');
  const newStatus = String(payload.status || '');
  const layer = String(payload.layer || '');
  const hubPlanPr = String(payload.hub_plan_pr || '');

  auditWorkflowStart({
    correlation_id: correlationId,
    source: `target-status-events:${eventType}`,
    epic_id: epicId,
    task_id: taskId,
    repository: context.repo.owner + '/' + context.repo.repo,
  });

  if (!epicId || !taskId || !newStatus) {
    throw new Error('Missing required fields: epic_id, task_id, or status.');
  }

  const task = getTaskById(process.cwd(), epicId, taskId);
  const node = getDeliveryNodeById(process.cwd(), epicId, taskId);
  const currentTaskStatus = task ? (task.status || 'draft') : null;
  const currentNodeStatus = node ? (node.status || 'planned') : null;

  console.log(`Status event: epic=${epicId} task=${taskId} layer=${layer || 'auto'} new=${newStatus}`);
  console.log(`Current task=${currentTaskStatus || 'unknown'} delivery=${currentNodeStatus || 'unknown'}`);

  if (layer === 'delivery' && currentNodeStatus) {
    applyDeliveryStatus({ payload, epicId, taskId, newStatus, currentNodeStatus, hubPlanPr, github, context });
  } else if (layer === 'task' && currentTaskStatus) {
    applyTaskStatus({ epicId, taskId, newStatus, currentTaskStatus });
  } else {
    applyAutoStatus({ payload, epicId, taskId, newStatus, currentNodeStatus, currentTaskStatus });
  }

  const completion = checkEpicCompletion(process.cwd(), epicId);
  core.setOutput('epic_complete', completion.complete ? 'true' : 'false');

  if (completion.complete) {
    console.log('All tasks complete. Epic is ready for archive.');
  } else {
    console.log('Epic not yet complete.');
  }

  auditWorkflowEnd(correlationId, {
    source: `target-status-events:${eventType}`,
    epic_id: epicId,
    task_id: taskId,
    repository: context.repo.owner + '/' + context.repo.repo,
    status: newStatus,
    layer: layer || 'auto',
  });
}

function applyDeliveryStatus({ payload, epicId, taskId, newStatus, currentNodeStatus, hubPlanPr, github, context }) {
  const validation = isValidTransition('delivery', currentNodeStatus, newStatus);
  if (!validation.valid) {
    console.log(`Invalid delivery transition: ${validation.reason}. Skipping.`);
    return;
  }

  execFileSync('node', [
    'bin/sync-state.js', 'update-pr', epicId, taskId, newStatus,
    `--pr-url=${payload.pr_url || ''}`,
    `--pr-number=${String(payload.pr_number || '')}`,
    `--branch=${payload.branch || ''}`,
  ], { stdio: 'inherit' });

  console.log(`Delivery node ${taskId} → ${newStatus}`);

  if (hubPlanPr && payload.pr_url && payload.pr_number) {
    updateHubPlanPrCrossRef({ github, context, hubPlanPr, payload });
  }
}

function applyTaskStatus({ epicId, taskId, newStatus, currentTaskStatus }) {
  const validation = isValidTransition('task', currentTaskStatus, newStatus);
  if (!validation.valid) {
    console.log(`Invalid task transition: ${validation.reason}. Skipping.`);
    return;
  }

  execFileSync('node', [
    'bin/sync-state.js', 'update-task', epicId, taskId, newStatus,
  ], { stdio: 'inherit' });

  console.log(`Task ${taskId} → ${newStatus}`);
}

function applyAutoStatus({ payload, epicId, taskId, newStatus, currentNodeStatus, currentTaskStatus }) {
  const deliveryStatuses = new Set(['branched', 'draft-pr', 'in-progress', 'ready-for-review', 'merged']);

  if (currentNodeStatus && deliveryStatuses.has(newStatus)) {
    execFileSync('node', [
      'bin/sync-state.js', 'update-pr', epicId, taskId, newStatus,
      `--pr-url=${payload.pr_url || ''}`,
      `--pr-number=${String(payload.pr_number || '')}`,
      `--branch=${payload.branch || ''}`,
    ], { stdio: 'inherit' });
  }

  const taskStatuses = {
    'branched': 'in-progress',
    'draft-pr': 'in-progress',
    'in-progress': 'in-progress',
    'ready-for-review': 'in-progress',
    'merged': 'done',
  };
  const taskMapped = taskStatuses[newStatus] || newStatus;

  if (currentTaskStatus && ['in-progress', 'done', 'blocked'].includes(taskMapped)) {
    execFileSync('node', [
      'bin/sync-state.js', 'update-task', epicId, taskId, taskMapped,
    ], { stdio: 'inherit' });
  }
}

async function updateHubPlanPrCrossRef({ github, context, hubPlanPr, payload }) {
  try {
    const linkLine = `**Target repo PR:** ${payload.repository || ''}#${payload.pr_number}`;
    const planPr = await github.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: Number(hubPlanPr),
    });
    const existingBody = planPr.data.body || '';
    const updatedBody = existingBody.includes('**Target repo PR:**')
      ? existingBody.replace(/\*\*Target repo PR:\*\*[^\n]*/, linkLine)
      : `${existingBody.trim()}\n\n${linkLine}\n`;

    await github.rest.pulls.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: Number(hubPlanPr),
      body: updatedBody.trim() + '\n',
    });
    console.log(`Updated hub plan PR #${hubPlanPr} with target repo cross-reference.`);
  } catch (err) {
    console.warn(`Failed to update hub plan PR cross-ref: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Trigger an epic-completion comment on the tracking issue
// ---------------------------------------------------------------------------
async function triggerEpicCompletionComment({ github, context, core }) {
  const payload = context.payload.client_payload || {};
  const epicId = payload.epic_id || '';

  const { data: issues } = await github.rest.issues.listForRepo({
    owner: context.repo.owner,
    repo: context.repo.repo,
    labels: 'epic',
    state: 'open',
    per_page: 20,
  });

  const epicIssue = issues.find(i => i.title.match(new RegExp(epicId, 'i')));

  if (epicIssue) {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: epicIssue.number,
      body: [
        'Epic is complete. All tasks are done and all PRs are merged.',
        '',
        'The epic can now be archived:',
        '```',
        `bin/dev wf:archive ${epicId}`,
        '```',
      ].join('\n'),
    });
  }
}

module.exports = {
  validateAndApplyStatusChange,
  triggerEpicCompletionComment,
};
