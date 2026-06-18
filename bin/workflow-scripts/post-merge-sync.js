const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readFrontmatterField, getTaskById } = require('../sync-state/epic-resolver');
const { isValidTransition } = require('../sync-state/status-validator');

async function determinePrTypeAndExtractContext({ context, core }) {
  const branch = context.payload.pull_request.head.ref;
  const body = context.payload.pull_request.body || '';
  const title = context.payload.pull_request.title || '';

  const isPlanBranch = branch.startsWith('plan/');
  const isEpicBranch = branch.startsWith('epic/');
  const isExecutionBranch = /^(feat|fix|chore|hotfix|refactor|docs|ci)\//.test(branch);
  const branchBody = branch.replace(/^(plan|epic)\//, '');
  const ticketId = branchBody.split('_')[0] || branchBody.split('-')[0] || '';

  const epicIdMatch = body.match(/\*\*Epic ID:\*\*\s*([^\n]+)/);
  const taskIdMatch = body.match(/\*\*Task ID:\*\*\s*([^\n]+)/);
  const epicId = epicIdMatch ? epicIdMatch[1].trim() : (isEpicBranch ? ticketId : '');
  const taskId = taskIdMatch ? taskIdMatch[1].trim() : (isPlanBranch ? ticketId : '');
  const targetPrMatch = body.match(/\*\*Target repo PR:\*\*\s*([^\n]+)/);
  const hubPrMatch = body.match(/\*\*Hub plan PR:\*\*\s*([^\n]+)/);

  core.setOutput('branch', branch);
  core.setOutput('is_plan_branch', String(isPlanBranch));
  core.setOutput('is_epic_branch', String(isEpicBranch));
  core.setOutput('is_execution_branch', String(isExecutionBranch));
  core.setOutput('epic_id', epicId);
  core.setOutput('task_id', taskId);
  core.setOutput('ticket_id', ticketId);
  core.setOutput('target_pr_ref', targetPrMatch ? targetPrMatch[1].trim() : '');
  core.setOutput('hub_pr_ref', hubPrMatch ? hubPrMatch[1].trim() : '');
  core.setOutput('title', title);
}

async function syncEpicBranchMerge({ context, core, inputs = {} }) {
  const epicId = inputs.epicId || process.env.EPIC_ID || '';
  let epicDir = inputs.epicDir || process.env.EPIC_DIR || '';
  if (!epicDir && epicId) {
    try {
      epicDir = execFileSync('node', ['bin/sync-state.js', 'find-epic', epicId], { encoding: 'utf8' }).trim();
    } catch (_) {
      epicDir = '';
    }
  }
  if (!epicDir) {
    return;
  }

  const epicFile = path.join(epicDir, 'epic.md');
  if (fs.existsSync(epicFile)) {
    const status = readFrontmatterField(epicFile, 'status');
    if (status !== 'active') {
      const text = fs.readFileSync(epicFile, 'utf8');
      const updated = text.replace(/^status:\s*.*$/m, 'status: active');
      fs.writeFileSync(epicFile, updated);
      console.log('Epic status set to active.');
    }
  }

  if (epicId) {
    try {
      const result = execFileSync('node', ['bin/sync-state.js', 'check-completion', epicId], { encoding: 'utf8' });
      const parsed = JSON.parse(result);
      core.setOutput('epic_complete', String(!!parsed.complete));
    } catch (_) {
      core.setOutput('epic_complete', 'false');
    }
  }
}

async function notifyHubOfExecutionMerge({ github, context, inputs = {} }) {
  const hubRef = inputs.hubPrRef || process.env.HUB_PR_REF || '';
  if (!hubRef) {
    console.log('No hub PR reference found. Skipping hub notification.');
    return;
  }

  const [hubOwner, hubRepoWithNum] = hubRef.split('/');
  const [hubRepo, hubPrNum] = (hubRepoWithNum || '').split('#');
  if (!hubOwner || !hubRepo || !hubPrNum) {
    console.log(`Could not parse hub PR reference: ${hubRef}`);
    return;
  }

  await github.rest.issues.createComment({
    owner: hubOwner,
    repo: hubRepo,
    issue_number: Number(hubPrNum),
    body: [
      'Target repo PR merged.',
      '',
      `**Repo:** ${context.repo.owner}/${context.repo.repo}`,
      `**PR:** #${context.payload.pull_request.number}`,
      `**Branch:** ${context.payload.pull_request.head.ref}`,
      '',
      'The hub plan PR can now be merged if all tasks are complete.',
    ].join('\n'),
  });
}

async function transitionJiraTicket({ context, inputs = {} }) {
  const epicId = inputs.epicId || process.env.EPIC_ID || '';
  const taskId = inputs.taskId || process.env.TASK_ID || '';
  const jiraBaseUrl = process.env.JIRA_BASE_URL || '';
  const jiraUserEmail = process.env.JIRA_USER_EMAIL || '';
  const jiraApiToken = process.env.JIRA_API_TOKEN || '';

  if (!jiraBaseUrl || !jiraUserEmail || !jiraApiToken || !epicId || !taskId) {
    return;
  }

  const task = getTaskById(process.cwd(), epicId, taskId);
  if (!task || !task.jira_ticket) {
    console.log('No Jira ticket found for task. Skipping.');
    return;
  }

  const jiraKey = task.jira_ticket.trim();
  console.log('Transitioning Jira ticket ' + jiraKey + ' to Done...');
  const url = jiraBaseUrl.replace(/\/$/, '') + '/rest/api/3/issue/' + jiraKey + '/transitions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString('base64'),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transition: { id: '31' } }),
  });

  if (response.ok) {
    console.log('Jira transitioned.');
  } else {
    console.log('Jira transition may have failed: ' + response.status);
  }
}

async function checkEpicCompletion({ core, inputs = {} }) {
  const epicId = inputs.epicId || process.env.EPIC_ID || '';
  if (!epicId) {
    core.setOutput('complete', 'false');
    return;
  }

  try {
    const result = execFileSync('node', ['bin/sync-state.js', 'check-completion', epicId], { encoding: 'utf8' });
    const parsed = JSON.parse(result);
    core.setOutput('complete', String(!!parsed.complete));
  } catch (_) {
    core.setOutput('complete', 'false');
  }
}

module.exports = {
  determinePrTypeAndExtractContext,
  syncEpicBranchMerge,
  notifyHubOfExecutionMerge,
  transitionJiraTicket,
  checkEpicCompletion,
};
