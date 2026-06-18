'use strict';

const fs = require('fs');
const path = require('path');
const { readFrontmatterField, resolveEpicDirectory } = require('../sync-state/epic-resolver');
const { resolveDependencies } = require('../sync-state/validators');

// ---------------------------------------------------------------------------
// Discover the plan manifest for a plan/ branch
// ---------------------------------------------------------------------------
function discoverPlanContext({ context, core }) {
  const branchRef = context.payload.pull_request.head.ref;
  const branchTaskId = branchRef.replace(/^plan\//, '').split(/[_-]/)[0];

  const found = findManifestForTask(branchTaskId);

  if (!found) {
    core.warning(`Unable to resolve plan manifest for branch ${branchRef}`);
    return;
  }

  core.setOutput('task_id', found.taskId);
  core.setOutput('epic_id', found.epicId);
  core.setOutput('target_repo', found.targetRepo);
}

function findManifestForTask(branchTaskId) {
  function walk(dir, results = []) {
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '_templates') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { results.push(full); walk(full, results); }
    }
    return results;
  }

  for (const root of ['agent-development/plans', 'fallback-sdd', 'repos']) {
    if (!fs.existsSync(root)) continue;
    for (const dir of walk(root)) {
      const manifest = path.join(dir, 'manifest.yaml');
      if (!fs.existsSync(manifest)) continue;
      const taskId = readFrontmatterField(manifest, 'task_id');
      if (String(taskId) === String(branchTaskId)) {
        return {
          manifest,
          planDir: dir,
          taskId,
          epicId: readFrontmatterField(manifest, 'epic_id'),
          targetRepo: readFrontmatterField(manifest, 'target_repo'),
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Check whether all dependencies of a task are done
// ---------------------------------------------------------------------------
function checkTaskDependencies({ context, core, inputs = {} }) {
  const epicId = inputs.epicId || '';
  const taskId = inputs.taskId || '';

  const epicDir = resolveEpicDirectory(process.cwd(), epicId);

  if (!epicDir) {
    core.setOutput('deps_ok', 'false');
    core.setOutput('blocked_by', 'epic-not-found');
    core.setOutput('message', `## ⚠️ Dependency Check Failed\n\nUnable to resolve epic directory for \`${epicId}\`. Dependency guardrail cannot run safely.`);
    return;
  }

  const depsCheck = resolveDependencies(epicDir, taskId);

  if (!depsCheck.allDone && depsCheck.blockedBy.length > 0) {
    const message = [
      '## ⚠️ Dependency Check Failed',
      '',
      `Task **${taskId}** is blocked by the following dependencies:`,
      '',
      ...depsCheck.blockedBy.map(dep => `- **${dep.id}** (${dep.title || 'Untitled'}) — Status: \`${dep.status}\``),
      '',
      '**This plan PR cannot be approved until all dependencies are completed.**',
    ].join('\n');

    core.setOutput('deps_ok', 'false');
    core.setOutput('message', message);
    core.setOutput('blocked_by', depsCheck.blockedBy.map(d => d.id).join(', '));
  } else {
    const message = [
      '## ✅ Dependency Check Passed',
      '',
      `Task **${taskId}** has no pending dependencies.`,
      '',
      'This plan is ready for review and approval.',
    ].join('\n');

    core.setOutput('deps_ok', 'true');
    core.setOutput('message', message);
  }
}

// ---------------------------------------------------------------------------
// Post a GitHub check run with dependency status
// ---------------------------------------------------------------------------
async function createDepsCheckRun({ github, context, core, inputs = {} }) {
  const depsOk = inputs.depsOk === 'true';
  const taskId = inputs.taskId || '';
  const blockedBy = inputs.blockedBy || '';
  const message = inputs.message || '';

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'Plan Dependency Check',
    head_sha: context.payload.pull_request.head.sha,
    status: 'completed',
    conclusion: depsOk ? 'success' : 'failure',
    output: {
      title: depsOk ? 'All dependencies satisfied' : 'Dependencies not satisfied',
      summary: depsOk
        ? `Task ${taskId} is ready for approval.`
        : `Task ${taskId} is blocked by: ${blockedBy}`,
      text: message,
    },
  });
}

// ---------------------------------------------------------------------------
// Create or update the dependency-check PR comment
// ---------------------------------------------------------------------------
async function commentDepsStatus({ github, context, core, inputs = {} }) {
  const message = inputs.message || '';
  const prNumber = context.payload.pull_request.number;

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });

  const existing = comments.find(
    c => c.user.login === 'github-actions[bot]' && c.body.includes('Dependency Check')
  );

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body: message,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: message,
    });
  }
}

module.exports = {
  discoverPlanContext,
  checkTaskDependencies,
  createDepsCheckRun,
  commentDepsStatus,
  findManifestForTask,
};
