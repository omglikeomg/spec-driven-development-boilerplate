'use strict';

const { detectSddContext } = require('./_shared/sdd');

// ---------------------------------------------------------------------------
// detect-sdd job: determine whether this PR is SDD-managed
// ---------------------------------------------------------------------------
function detectSddPR({ context, core }) {
  const branch = context.payload.pull_request.head.ref;
  const body = context.payload.pull_request.body || '';
  const { isSdd } = detectSddContext(branch, body);

  core.setOutput('is_sdd', String(isSdd));

  if (!isSdd) {
    console.log('Non-SDD PR detected. Lifecycle automation skipped.');
  }
}

// ---------------------------------------------------------------------------
// label job: classify PR and add GitHub labels
// ---------------------------------------------------------------------------
async function classifyAndLabelPR({ github, context, core }) {
  const pr = context.payload.pull_request;
  const branch = pr.head.ref;
  const isDraft = pr.draft;
  const title = pr.title || '';
  const body = pr.body || '';
  const labels = [];

  if (branch.startsWith('epic/')) {
    labels.push('epic');
  } else if (branch.startsWith('plan/')) {
    labels.push('plan');
  } else if (/^(feat|fix|chore|hotfix|refactor|docs|ci)\//.test(branch)) {
    labels.push('execution', branch.split('/')[0]);
  }

  if (isDraft) labels.push('draft');

  const hasCrossRef = /(\*\*Target repo PR:\*\*|\*\*Hub plan PR:\*\*)/.test(body);
  const isPlanOrExec = branch.startsWith('plan/') || /^(feat|fix|chore|hotfix|refactor|docs|ci)\//.test(branch);
  if (!hasCrossRef && isPlanOrExec) labels.push('missing-cross-ref');

  if (title && !/^(feat|fix|chore|hotfix|refactor|docs|ci)(\(.+\))?:\s/.test(title)) {
    labels.push('non-conventional-title');
  }

  if (labels.length > 0) {
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pr.number,
      labels,
    });
  }

  core.setOutput('labels', labels.join(', '));
}

// ---------------------------------------------------------------------------
// label job: post guidance comment when PR is opened or marked ready
// ---------------------------------------------------------------------------
async function postLifecycleGuidance({ github, context, core }) {
  const { getDeliveryNodeById } = require('../sync-state/epic-resolver');
  const pr = context.payload.pull_request;
  const branch = pr.head.ref;
  const body = pr.body || '';

  const epicMatch = body.match(/\*\*Epic ID:\*\*\s*([^\n]+)/);
  const taskMatch = body.match(/\*\*Task ID:\*\*\s*([^\n]+)/);
  const branchTask = branch.startsWith('plan/')
    ? (branch.replace(/^plan\//, '').split(/[_-]/)[0] || '')
    : '';
  const epicId = epicMatch ? epicMatch[1].trim() : '';
  const taskId = taskMatch ? taskMatch[1].trim() : branchTask;

  const node = epicId && taskId ? getDeliveryNodeById(process.cwd(), epicId, taskId) : null;
  const messages = [];

  if (pr.draft && branch.startsWith('plan/')) {
    messages.push('This plan PR is in draft. It will become ready for review once the plan manifest is approved and execution begins.');
  }

  if (branch.startsWith('plan/') && node && node.pr_url && !/\*\*Target repo PR:\*\*/.test(body)) {
    messages.push('**Missing cross-reference:** Add `**Target repo PR:** <org>/<repo>#<number>` to the PR description when the execution PR is created.');
  }

  if (/^(feat|fix|chore|hotfix|refactor|docs|ci)\//.test(branch) && !/\*\*Hub plan PR:\*\*/.test(body)) {
    messages.push('**Missing cross-reference:** Add `**Hub plan PR:** <org>/<hub-repo>#<number>` to the PR description to link back to the hub plan.');
  }

  if (messages.length > 0) {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pr.number,
      body: messages.join('\n\n'),
    });
  }
}

// ---------------------------------------------------------------------------
// auto-ready job: post readiness checklist when a plan PR is marked ready
// ---------------------------------------------------------------------------
async function markPlanPrReady({ github, context, core }) {
  const pr = context.payload.pull_request;
  const body = pr.body || '';
  const hasTargetPr = /\*\*Target repo PR:\*\*/.test(body);

  if (!hasTargetPr) return;

  const targetPrRef = body.match(/\*\*Target repo PR:\*\*\s*([^\n]+)/)?.[1] || 'found';

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pr.number,
    body: [
      'Plan PR is ready for review.',
      '',
      '**Checklist:**',
      `- [x] Target repo PR linked: ${targetPrRef}`,
      '- [ ] Plan manifest reviewed',
      '- [ ] Verification gate passed',
      '- [ ] Ready to merge',
    ].join('\n'),
  });
}

module.exports = {
  detectSddPR,
  classifyAndLabelPR,
  postLifecycleGuidance,
  markPlanPrReady,
};
