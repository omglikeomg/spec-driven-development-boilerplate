'use strict';

const { generateIntegrityToken, generateCorrelationId } = require('../sync-state/audit');

// ---------------------------------------------------------------------------
// Extract epic/task context from PR body (fallback when .sdd/task-context.yaml absent)
// ---------------------------------------------------------------------------
function extractContextFromPrBody({ context, core }) {
  const body = context.payload.pull_request?.body || '';

  const epicId = body.match(/\*\*Epic ID:\*\*\s*([^\n]+)/)?.[1]?.trim() || '';
  const taskId = body.match(/\*\*Task ID:\*\*\s*([^\n]+)/)?.[1]?.trim() || '';
  const hubPlanBranch = body.match(/\*\*Hub plan branch:\*\*\s*([^\n]+)/)?.[1]?.trim() || '';
  const hubPlanPr = body.match(/\*\*Hub plan PR:\*\*\s*([^\n]+)/)?.[1]?.trim() || '';

  core.setOutput('epic_id', epicId);
  core.setOutput('task_id', taskId);
  core.setOutput('hub_plan_branch', hubPlanBranch);
  core.setOutput('hub_plan_pr', hubPlanPr);
}

// ---------------------------------------------------------------------------
// Dispatch a verify-pr event to the hub repo
// ---------------------------------------------------------------------------
async function dispatchVerificationToHub({ github, context, core, inputs = {} }) {
  const hubRepo = inputs.hubRepo || process.env.HUB_REPO || '';
  const [hubOwner, hubName] = hubRepo.split('/');

  if (!hubOwner || !hubName) {
    console.log(`Cannot parse hub repo: ${hubRepo}`);
    return;
  }

  const epicId = inputs.epicId || '';
  const taskId = inputs.taskId || '';
  const hubPlanBranch = inputs.hubPlanBranch || '';
  const hubPlanPr = inputs.hubPlanPr || '';

  if (!epicId || !taskId) {
    console.log('No epic/task context found. Skipping verification notification.');
    return;
  }

  const correlationId = generateCorrelationId();
  const payload = {
    repository: context.repo.owner + '/' + context.repo.repo,
    pr_number: context.payload.pull_request?.number || '',
    pr_url: context.payload.pull_request?.html_url || '',
    branch: context.payload.pull_request?.head?.ref || '',
    epic_id: epicId,
    task_id: taskId,
    hub_plan_branch: hubPlanBranch,
    hub_plan_pr: hubPlanPr,
    correlation_id: correlationId,
  };

  const secret = process.env.HUB_INTEGRITY_SECRET || '';
  if (secret) {
    payload.integrity_token = generateIntegrityToken(secret, payload);
  }

  await github.rest.repos.createDispatchEvent({
    owner: hubOwner,
    repo: hubName,
    event_type: 'verify-pr',
    client_payload: payload,
  });

  console.log(`Verification notification dispatched. Correlation ID: ${correlationId}`);
}

module.exports = {
  extractContextFromPrBody,
  dispatchVerificationToHub,
};
