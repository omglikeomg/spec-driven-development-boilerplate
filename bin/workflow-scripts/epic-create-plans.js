const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { readFrontmatterField } = require('../sync-state/epic-resolver');
const { readTaskGraphTasks } = require('../sync-state/task-graph');
const { slugify } = require('./_shared/config');

async function discoverEpicContext({ context, core }) {
  const branchRef = context.payload.pull_request.head.ref;
  const branchBody = branchRef.replace(/^epic\//, '');
  const branchTicket = branchBody.split(/[_-]/)[0] || branchBody;

  const epicRoots = ['epics/active', 'epics/done', 'epics'];
  let found = null;

  for (const root of epicRoots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === '_templates') continue;
      const epicDir = path.join(root, entry.name);
      const epicFile = path.join(epicDir, 'epic.md');
      if (!fs.existsSync(epicFile)) continue;
      const epicId = readFrontmatterField(epicFile, 'id');
      if (String(epicId) === String(branchTicket) || entry.name.startsWith(epicId)) {
        found = { epicDir, epicId, epicFile };
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    throw new Error(`Unable to resolve epic for branch ${branchRef}`);
  }

  core.setOutput('epic_dir', found.epicDir);
  core.setOutput('epic_id', found.epicId);
}

async function readTaskGraph({ core, inputs = {} }) {
  const epicDir = inputs.epicDir || process.env.EPIC_DIR || '';
  const taskGraphPath = path.join(epicDir, 'task-graph.md');
  if (!fs.existsSync(taskGraphPath)) {
    throw new Error(`Task graph not found: ${taskGraphPath}`);
  }

  const tasks = readTaskGraphTasks(taskGraphPath);
  const readyTasks = tasks.filter((task) => {
    const deps = task.depends_on || [];
    if (deps.length === 0) return true;
    return deps.every((depId) => {
      const depTask = tasks.find((t) => t.id === depId);
      return depTask && depTask.status === 'done';
    });
  });

  core.setOutput('all_tasks', JSON.stringify(tasks));
  core.setOutput('ready_tasks', JSON.stringify(readyTasks));
  core.setOutput('ready_count', readyTasks.length);
}

async function createPlanBranchesAndPrs({ github, context, inputs = {} }) {
  const epicId = inputs.epicId || process.env.EPIC_ID || '';
  const epicDir = inputs.epicDir || process.env.EPIC_DIR || '';
  const allTasks = JSON.parse(process.env.ALL_TASKS || '[]');

  const results = [];
  for (const task of allTasks) {
    try {
      const taskSlug = slugify(task.title || `task-${task.id}`);
      const planBranch = `plan/${task.id}_${taskSlug}`;
      const planDir = `fallback-sdd/${task.repo}/agent-development/plans/${task.id}-${taskSlug}`;

      execSync(`git checkout main`, { stdio: 'inherit' });
      execSync(`git checkout -b "${planBranch}"`, { stdio: 'inherit' });
      execSync(`mkdir -p "${planDir}"`, { stdio: 'inherit' });

      const requestPath = path.join(epicDir, 'requests', task.request_file || `task-${task.id}.md`);
      const requestContent = fs.existsSync(requestPath) ? fs.readFileSync(requestPath, 'utf8') : 'No request file provided.';
      const manifestContent = [
        '---',
        `task_id: ${task.id}`,
        `task_name: ${task.title || `Task ${task.id}`}`,
        `epic_id: ${epicId}`,
        `target_repo: ${task.repo}`,
        'status: draft',
        '---',
        '',
        `# Task ${task.id}: ${task.title || 'Untitled'}`,
        '',
        '## Overview',
        `Implementation plan for task ${task.id} from epic ${epicId}.`,
        '',
        '## Request',
        'See specification.md for details.',
        '',
      ].join('\n');

      fs.writeFileSync(path.join(planDir, 'manifest.yaml'), manifestContent);
      fs.writeFileSync(path.join(planDir, 'specification.md'), requestContent);

      execSync(`git add "${planDir}"`, { stdio: 'inherit' });
      execSync(`git config user.name "github-actions[bot]"`, { stdio: 'inherit' });
      execSync(`git config user.email "github-actions[bot]@users.noreply.github.com"`, { stdio: 'inherit' });
      execSync(`git commit -m "chore(plan): create plan for task ${task.id}"`, { stdio: 'inherit' });
      execSync(`git push origin "${planBranch}"`, { stdio: 'inherit' });

      const prTitle = `plan(${task.id}): ${task.title || 'Untitled'}`;
      const prBody = [
        '## Plan for Task',
        '',
        `**Epic ID:** ${epicId}`,
        `**Task ID:** ${task.id}`,
        `**Target repo:** ${task.repo}`,
        `**Dependencies:** ${(task.depends_on || []).join(', ') || 'None'}`,
        '',
        '## Review Checklist',
        '- [ ] Specification is complete and clear',
        '- [ ] Dependencies are identified',
        '- [ ] Blast radius is acceptable',
        '',
        '**⚠️ Dependency Check:** This plan can only be approved if all dependencies are completed.',
        '',
        '**Next steps:**',
        '- Wait for the `Plan Generated by Agent` check to pass',
        '- Then approve/merge this plan PR to dispatch to the target repo',
      ].join('\n');

      const prResult = await github.rest.pulls.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: prTitle,
        body: prBody,
        head: planBranch,
        base: 'main',
        draft: true,
      });

      results.push({
        taskId: task.id,
        success: true,
        prNumber: prResult.data.number,
        branch: planBranch,
      });
    } catch (error) {
      results.push({ taskId: task.id, success: false, error: error.message });
    }
  }

  execSync(`git checkout main`, { stdio: 'inherit' });
  context.payload.client_payload = context.payload.client_payload || {};
  context.payload.client_payload.results = JSON.stringify(results);
  return results;
}

async function commentOnEpic({ github, context, inputs = {} }) {
  const results = JSON.parse(inputs.resultsJson || process.env.RESULTS_JSON || '[]');
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  const body = [
    '## 📋 Plan PRs Created',
    '',
    `**Epic ID:** ${inputs.epicId || process.env.EPIC_ID || ''}`,
    `**Plan PRs created:** ${successCount}`,
    `**Failed:** ${failCount}`,
    '',
    '### Created Plan PRs',
    '',
    ...results.filter((r) => r.success).map((r) => `- ✅ Task ${r.taskId} → PR #${r.prNumber} (\`${r.branch}\`)`),
    '',
    results.some((r) => !r.success) ? '### Failed Plans' : '',
    results.some((r) => !r.success) ? '' : '',
    ...results.filter((r) => !r.success).map((r) => `- ❌ Task ${r.taskId}: ${r.error}`),
    '',
    '**Next steps:**',
    '- Review and approve each plan PR',
    '- Dependencies will be checked automatically',
    '- Upon approval, tasks will be dispatched to child repos',
  ].filter(Boolean).join('\n');

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request.number,
    body,
  });
}

module.exports = {
  discoverEpicContext,
  readTaskGraph,
  createPlanBranchesAndPrs,
  commentOnEpic,
};
