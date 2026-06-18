const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { verifyIntegrityToken, auditWorkflowStart } = require('../sync-state/audit');
const { resolvePlanManifest, resolveEpicDirectory, readFrontmatterField } = require('../sync-state/epic-resolver');
const { readText, splitMarkdownFrontmatter } = require('../sync-state/_common');
const { readTaskGraphTasks } = require('../sync-state/task-graph');

const hubRoot = path.join(__dirname, '..', '..');

async function verifyIntegrityTokenStep({ context, core, inputs = {} }) {
  const cid = String(inputs.runId || process.env.RUN_ID || process.env.GITHUB_RUN_ID || '');
  const payload = {};
  for (const key of Object.keys(context.payload.client_payload || {})) {
    if (key !== 'integrity_token') {
      payload[key] = context.payload.client_payload[key];
    }
  }

  const token = context.payload.client_payload?.integrity_token || '';
  const secret = process.env.HUB_INTEGRITY_SECRET || '';

  if (secret && token && !verifyIntegrityToken(secret, token, payload)) {
    console.warn('Integrity token verification failed. Event may not be from the expected hub.');
  }

  auditWorkflowStart({
    correlation_id: cid,
    source: 'receive-task',
    epic_id: inputs.epicId || process.env.EPIC_ID || '',
    task_id: inputs.taskId || process.env.TASK_ID || '',
    repository: context.repo.owner + '/' + context.repo.repo,
  });
}

async function synthesizeImplementationWithAI({ context, core, inputs = {} }) {
  const epicId = inputs.epicId || process.env.EPIC_ID || '';
  const taskId = inputs.taskId || process.env.TASK_ID || '';
  const taskName = inputs.taskName || process.env.TASK_NAME || '';
  const executionBranch = inputs.executionBranch || process.env.EXECUTION_BRANCH || '';
  const repoRoot = process.cwd();

  function bodyOnly(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const text = readText(filePath);
    const split = splitMarkdownFrontmatter(text);
    return split.bodyLines.join('\n').trim();
  }

  function clip(text, max = 8000) {
    return String(text || '').slice(0, max);
  }

  const manifestPath = resolvePlanManifest(hubRoot, epicId, taskId);
  const planDir = manifestPath ? path.dirname(manifestPath) : null;
  const epicDir = epicId ? resolveEpicDirectory(hubRoot, epicId) : null;

  let taskTitle = taskName;
  let requestFile = '';
  let targetRepo = '';
  if (epicDir) {
    const taskGraphPath = path.join(epicDir, 'task-graph.md');
    if (fs.existsSync(taskGraphPath)) {
      const tasks = readTaskGraphTasks(taskGraphPath);
      const task = tasks.find((t) => String(t.id) === String(taskId));
      if (task) {
        taskTitle = task.title || taskName;
        requestFile = task.request_file || '';
      }
    }
  }
  if (manifestPath) {
    targetRepo = readFrontmatterField(manifestPath, 'target_repo') || '';
  }

  const epicText = clip(epicDir ? bodyOnly(path.join(epicDir, 'epic.md')) : '');
  const taskGraphText = clip(epicDir ? bodyOnly(path.join(epicDir, 'task-graph.md')) : '');
  const requestText = clip((epicDir && requestFile) ? bodyOnly(path.join(epicDir, 'requests', requestFile)) : '');
  const specText = clip(planDir ? (fs.existsSync(path.join(planDir, 'specification.md')) ? readText(path.join(planDir, 'specification.md')) : '') : '');
  const manifestText = clip(manifestPath && fs.existsSync(manifestPath) ? readText(manifestPath) : '');

  let repoStructure = '';
  try {
    repoStructure = execSync(
      'find . -type f -not -path "./.git/*" -not -path "./.sdd-hub/*" -not -path "./node_modules/*" | sort | head -60',
      { cwd: repoRoot, encoding: 'utf8' }
    );
  } catch (_) {}

  let packageJson = '';
  const pkgPath = path.join(repoRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    packageJson = clip(readText(pkgPath), 2000);
  }

  const prompt = [
    'You are an expert software developer. Implement a task from a Spec-Driven Development (SDD) system.',
    'Generate complete, working implementation files for the task described below.',
    '',
    'Return ONLY strict JSON — no markdown, no explanation, no code fences. Schema:',
    '{',
    '  "summary": "one-line description of what was implemented",',
    '  "files": [',
    '    { "path": "relative/path/from/repo/root", "content": "complete file content" }',
    '  ]',
    '}',
    '',
    `Task ID: ${taskId}`,
    `Task: ${taskTitle}`,
    `Target Repo: ${targetRepo || 'sdd-test-api'}`,
    '',
    '## Epic',
    epicText || '(none)',
    '',
    '## Task Graph',
    taskGraphText || '(none)',
    '',
    '## Task Request',
    requestText || '(none)',
    '',
    '## Implementation Plan / Specification',
    specText || '(none)',
    '',
    '## Plan Manifest',
    manifestText || '(none)',
    '',
    '## Existing Repository Structure',
    repoStructure || '(empty repo)',
    '',
    '## package.json',
    packageJson || '(no package.json)',
    '',
    '## Branch Context',
    `Execution branch: ${executionBranch}`,
  ].join('\n');

  const modelUrl = 'https://models.github.ai/inference/chat/completions';
  const modelName = 'openai/gpt-4o';
  let parsed = null;
  let lastErr = '';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(modelUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HUB_CROSS_REPO_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are an SDD implementation agent. Output JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      }
      const data = await response.json();
      const raw = String(data.choices?.[0]?.message?.content || '').trim();
      const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      const jsonText = fenced ? fenced[1].trim() : raw;
      parsed = JSON.parse(jsonText);
      break;
    } catch (err) {
      lastErr = String(err.message || err);
      console.error(`Attempt ${attempt} failed: ${lastErr}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, [10000, 25000][attempt - 1]));
    }
  }

  if (!parsed || !Array.isArray(parsed.files)) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `ai_ok=false\nai_summary=AI code synthesis failed: ${lastErr.replace(/\n/g, ' ')}\n`);
    console.error('AI code synthesis failed — PR will be opened with context file only.');
    return;
  }

  let written = 0;
  for (const file of parsed.files) {
    if (!file.path || typeof file.content !== 'string') continue;
    const resolved = path.resolve(repoRoot, file.path);
    if (!resolved.startsWith(repoRoot + path.sep) && resolved !== repoRoot) continue;
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, file.content, 'utf8');
    written += 1;
  }

  if (written === 0) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `ai_ok=false\nai_summary=AI returned no valid files\n`);
    return;
  }

  execSync('git add -A', { cwd: repoRoot, stdio: 'inherit' });
  const changedOutput = execSync('git diff --cached --name-only', { cwd: repoRoot, encoding: 'utf8' });
  if (changedOutput.trim()) {
    execSync(`git commit -m "feat(sdd): AI-generated implementation for task ${taskId}"`, { cwd: repoRoot, stdio: 'inherit' });
    execSync(`git push origin HEAD:"${executionBranch}"`, { cwd: repoRoot, stdio: 'inherit' });
  }

  const summary = String(parsed.summary || `${written} file(s) generated`).replace(/\n/g, ' ');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `ai_ok=true\nai_summary=${summary}\n`);
  console.log(`AI synthesis completed: ${summary}`);
}

// ---------------------------------------------------------------------------
// Open a draft PR in the target repo after branch setup
// ---------------------------------------------------------------------------
async function openDraftPr({ github, context, core, inputs = {} }) {
  const aiOk = inputs.aiOk === 'true';
  const aiSummary = inputs.aiSummary || 'AI synthesis skipped.';

  const prBody = [
    '## SDD Task Context',
    '',
    `**Epic ID:** ${inputs.epicId}`,
    `**Task ID:** ${inputs.taskId}`,
    `**Task Name:** ${inputs.taskName}`,
    `**Hub plan PR:** ${inputs.hubRepo}#${inputs.hubPlanPr}`,
    `**Hub plan branch:** ${inputs.hubPlanBranch}`,
    '',
    '---',
    '',
    aiOk
      ? `✅ **AI implementation generated** — ${aiSummary}`
      : `⚠️ **AI synthesis did not complete** — ${aiSummary} Review and implement manually.`,
    '',
    'Context files: `.sdd/task-context.yaml` (primary) and `.sdd/context.yaml` (compatibility alias)',
    '',
    'This PR was auto-created by the SDD hub automation.',
  ].join('\n');

  const pr = await github.rest.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: `feat(sdd): [${inputs.taskId}] ${inputs.taskName}`,
    head: inputs.executionBranch,
    base: context.payload.repository?.default_branch || 'main',
    body: prBody,
    draft: true,
  });

  core.setOutput('pr_number', String(pr.data.number));
  core.setOutput('pr_url', pr.data.html_url);
}

// ---------------------------------------------------------------------------
// Notify the hub that a draft PR was created in this target repo
// ---------------------------------------------------------------------------
async function notifyHubOfPrCreation({ github, context, core, inputs = {} }) {
  const { generateCorrelationId } = require('../sync-state/audit');
  const hubRepo = inputs.hubRepo || '';
  const [hubOwner, hubName] = hubRepo.split('/');

  if (!hubOwner || !hubName) {
    console.log(`Cannot parse hub repo from: ${hubRepo}`);
    return;
  }

  const correlationId = generateCorrelationId();
  await github.rest.repos.createDispatchEvent({
    owner: hubOwner,
    repo: hubName,
    event_type: 'pr-status-change',
    client_payload: {
      epic_id: inputs.epicId,
      task_id: inputs.taskId,
      status: 'draft-pr',
      layer: 'delivery',
      hub_plan_pr: inputs.hubPlanPr,
      pr_url: inputs.prUrl,
      pr_number: inputs.prNumber,
      branch: inputs.executionBranch,
      repository: context.repo.owner + '/' + context.repo.repo,
      correlation_id: correlationId,
    },
  });

  console.log(`Hub notification dispatched. Correlation ID: ${correlationId}`);
}

module.exports = {
  verifyIntegrityTokenStep,
  synthesizeImplementationWithAI,
  openDraftPr,
  notifyHubOfPrCreation,
};
