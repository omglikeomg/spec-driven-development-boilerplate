'use strict';

const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// Check whether an epic is complete; set outputs for workflow_call consumers
// ---------------------------------------------------------------------------
function checkCompletion({ core, inputs = {} }) {
  const epicId = inputs.epicId || process.env.EPIC_ID || '';

  if (!epicId) {
    core.setOutput('complete', 'false');
    core.setOutput('task_count', '0');
    core.setOutput('done_tasks', '0');
    return;
  }

  let result;
  try {
    result = JSON.parse(
      execFileSync('node', ['bin/sync-state.js', 'check-completion', epicId], {
        encoding: 'utf8', timeout: 15000,
      })
    );
  } catch (_) {
    result = { complete: false, taskCount: 0, doneTasks: 0 };
  }

  core.setOutput('complete', result.complete ? 'true' : 'false');
  core.setOutput('task_count', String(result.taskCount || 0));
  core.setOutput('done_tasks', String(result.doneTasks || 0));
  console.log(`Epic ${epicId}: ${result.doneTasks || 0} / ${result.taskCount || 0} tasks done. Complete: ${result.complete}`);
}

// ---------------------------------------------------------------------------
// Comment on the epic tracking issue(s) when all tasks are done
// ---------------------------------------------------------------------------
async function commentOnEpicIssues({ github, context, inputs = {} }) {
  const epicId = inputs.epicId || '';
  const taskCount = inputs.taskCount || '?';
  const doneTasks = inputs.doneTasks || '?';

  const { data: issues } = await github.rest.issues.listForRepo({
    owner: context.repo.owner,
    repo: context.repo.repo,
    labels: 'epic',
    state: 'open',
    per_page: 30,
  });

  for (const issue of issues) {
    if (issue.title.includes(epicId)) {
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issue.number,
        body: [
          `Epic ${epicId} appears to be complete.`,
          '',
          `**Tasks:** ${doneTasks} / ${taskCount} done`,
          '',
          'The epic can be archived:',
          '```',
          `bin/dev wf:archive ${epicId}`,
          '```',
        ].join('\n'),
      });
      break;
    }
  }
}

module.exports = {
  checkCompletion,
  commentOnEpicIssues,
};
