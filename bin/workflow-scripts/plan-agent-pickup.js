'use strict';

const fs = require('fs');
const path = require('path');
const { readText, splitMarkdownFrontmatter } = require('../sync-state/_common');
const { resolvePlanManifest, resolveEpicDirectory, readFrontmatterField } = require('../sync-state/epic-resolver');
const { readTaskGraphTasks } = require('../sync-state/task-graph');

const MODEL_URL = 'https://models.github.ai/inference/chat/completions';
const MODEL_NAME = 'openai/gpt-4o';
const AI_PLAN_MARKER_START = '<!-- ai-plan:start -->';
const AI_PLAN_MARKER_END = '<!-- ai-plan:end -->';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function bodyOnly(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  const split = splitMarkdownFrontmatter(readText(filePath));
  return split.bodyLines.join('\n').trim();
}

function clip(text, max = 12000) {
  return String(text || '').slice(0, max);
}

function upsertFrontmatter(mdText, key, value) {
  const match = mdText.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return mdText;
  const fm = match[1];
  const rest = mdText.slice(match[0].length);
  const line = `${key}: ${value}`;
  const next = new RegExp(`^${key}:\\s*.*$`, 'm').test(fm)
    ? fm.replace(new RegExp(`^${key}:\\s*.*$`, 'm'), line)
    : `${fm}\n${line}`;
  return `---\n${next}\n---\n${rest}`;
}

// ---------------------------------------------------------------------------
// Discover plan context from branch name and manifest files
// ---------------------------------------------------------------------------
function discoverPlanContext({ context, core }) {
  const branchRef = process.env.BRANCH_REF || context.payload.pull_request?.head?.ref || '';
  if (!branchRef) {
    core.setOutput('found', 'false');
    core.setOutput('message', 'No branch ref provided for plan pickup.');
    return;
  }
  const branchBody = branchRef.replace(/^plan\//, '');
  const taskId = branchBody.split(/[_-]/)[0];
  const manifestPath = resolvePlanManifest(process.cwd(), null, taskId);

  if (!manifestPath) {
    core.setOutput('found', 'false');
    core.setOutput('message', `No manifest found for task ${taskId} on ${branchRef}.`);
    return;
  }

  const epicId = readFrontmatterField(manifestPath, 'epic_id') || '';
  const targetRepo = readFrontmatterField(manifestPath, 'target_repo') || '';
  const planDir = path.dirname(manifestPath);
  const epicDir = epicId ? resolveEpicDirectory(process.cwd(), epicId) : null;

  let taskTitle = '';
  let requestFile = '';
  if (epicDir) {
    const taskGraphPath = path.join(epicDir, 'task-graph.md');
    if (fs.existsSync(taskGraphPath)) {
      const tasks = readTaskGraphTasks(taskGraphPath);
      const task = tasks.find((t) => String(t.id) === String(taskId));
      if (task) {
        taskTitle = task.title || '';
        requestFile = task.request_file || '';
      }
    }
  }

  core.setOutput('found', 'true');
  core.setOutput('task_id', taskId);
  core.setOutput('epic_id', epicId);
  core.setOutput('target_repo', targetRepo);
  core.setOutput('task_title', taskTitle);
  core.setOutput('request_file', requestFile);
  core.setOutput('manifest_path', manifestPath);
  core.setOutput('plan_dir', planDir);
}

function buildPlanPrompt({ manifestPath, planDir, epicId, taskId, taskTitle, targetRepo, requestFile }) {
  const specPath = path.join(planDir, 'specification.md');
  const epicDir = resolveEpicDirectory(process.cwd(), epicId || '');
  const epicFile = epicDir ? path.join(epicDir, 'epic.md') : '';
  const taskGraphFile = epicDir ? path.join(epicDir, 'task-graph.md') : '';
  const requestFilePath = (epicDir && requestFile) ? path.join(epicDir, 'requests', requestFile) : '';

  return [
    'Generate an implementation plan section for an SDD task.',
    'Return strict JSON only with this schema:',
    '{ "summary": "string", "implementation_steps": ["string"], "files_to_touch": ["string"], "verification_steps": ["string"], "risks": ["string"], "open_questions": ["string"] }',
    '',
    `Task ID: ${taskId}`,
    `Task Title: ${taskTitle}`,
    `Target Repo: ${targetRepo}`,
    '',
    'Epic:', clip(bodyOnly(epicFile)) || '(none)',
    '',
    'Task Graph:', clip(bodyOnly(taskGraphFile)) || '(none)',
    '',
    'Request:', clip(bodyOnly(requestFilePath)) || '(none)',
    '',
    'Current Plan Manifest:',
    clip(fs.existsSync(manifestPath) ? readText(manifestPath) : '') || '(none)',
    '',
    'Current Specification:',
    clip(fs.existsSync(specPath) ? readText(specPath) : '') || '(none)',
    '',
    'Constraints:',
    '- Keep steps concrete and implementable.',
    '- Respect dependency order in task graph.',
    '- Include test/verification expectations.',
    '- Do not invent services not present in repo.',
  ].join('\n');
}

async function callModel(prompt, { systemPrompt = 'You are an SDD planning agent. Output JSON only.', maxTokens = 1800, temperature = 0.2 } = {}) {
  const delays = [8000, 20000];
  let lastErr = '';

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = String((await response.json()).choices?.[0]?.message?.content || '').trim();
      const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      return JSON.parse(fenced ? fenced[1].trim() : raw);
    } catch (err) {
      lastErr = String(err.message || err);
      if (attempt < 3) await new Promise(r => setTimeout(r, delays[attempt - 1]));
    }
  }

  throw new Error(`AI synthesis failed after 3 attempts: ${lastErr}`);
}

// ---------------------------------------------------------------------------
// Synthesize a plan with AI and write to GITHUB_OUTPUT
// ---------------------------------------------------------------------------
async function synthesizePlanWithAI({ context, core }) {
  const manifestPath = process.env.MANIFEST_PATH || '';
  const planDir = process.env.PLAN_DIR || '';
  const epicId = process.env.EPIC_ID || '';
  const taskId = process.env.TASK_ID || '';
  const taskTitle = process.env.TASK_TITLE || '';
  const targetRepo = process.env.TARGET_REPO || '';
  const requestFile = process.env.REQUEST_FILE || '';

  try {
    const parsed = await callModel(
      buildPlanPrompt({ manifestPath, planDir, epicId, taskId, taskTitle, targetRepo, requestFile })
    );
    const encoded = Buffer.from(JSON.stringify(parsed), 'utf8').toString('base64');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `ai_ok=true\nai_plan_b64=${encoded}\nai_message=AI synthesis completed\n`);
  } catch (err) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `ai_ok=false\nai_message=${String(err.message).replace(/\n/g, ' ')}\n`);
  }
}

// ---------------------------------------------------------------------------
// Apply AI synthesis to manifest and specification.md
// ---------------------------------------------------------------------------
function applyAiSynthesis({ context, core }) {
  const manifestPath = process.env.MANIFEST_PATH || '';
  const planDir = process.env.PLAN_DIR || '';
  const b64 = process.env.AI_PLAN_B64 || '';

  if (!b64) return;

  const aiPlan = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  const now = new Date().toISOString();

  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    manifest = upsertFrontmatter(manifest, 'agent_generated', 'true');
    manifest = upsertFrontmatter(manifest, 'agent_generated_at', `"${now}"`);
    manifest = upsertFrontmatter(manifest, 'agent_generation_source', 'github-models');
    fs.writeFileSync(manifestPath, manifest);
  }

  const listItems = (arr) => Array.isArray(arr) ? arr.map(s => `- ${s}`) : [];
  const section = [
    AI_PLAN_MARKER_START,
    '## AI Plan Synthesis',
    '',
    aiPlan.summary ? `**Summary:** ${aiPlan.summary}` : '',
    '',
    '### Implementation Steps', ...listItems(aiPlan.implementation_steps),
    '',
    '### Files to Touch', ...listItems(aiPlan.files_to_touch),
    '',
    '### Verification', ...listItems(aiPlan.verification_steps),
    '',
    '### Risks', ...listItems(aiPlan.risks),
    '',
    '### Open Questions', ...listItems(aiPlan.open_questions),
    AI_PLAN_MARKER_END,
    '',
  ].filter(l => l !== null && l !== undefined).join('\n');

  const specPath = path.join(planDir, 'specification.md');
  if (fs.existsSync(specPath)) {
    let spec = fs.readFileSync(specPath, 'utf8');
    const markerRe = new RegExp(`${AI_PLAN_MARKER_START}[\\s\\S]*?${AI_PLAN_MARKER_END}\n?`, 'm');
    spec = spec.includes(AI_PLAN_MARKER_START)
      ? spec.replace(markerRe, section)
      : `${spec.replace(/\s*$/, '')}\n\n${section}`;
    fs.writeFileSync(specPath, spec);
  }
}

// ---------------------------------------------------------------------------
// Publish a check run reflecting agent pickup result
// ---------------------------------------------------------------------------
async function publishPickupCheck({ github, context, core }) {
  const found = process.env.FOUND === 'true';
  const aiOk = process.env.AI_OK === 'true';
  const taskId = process.env.TASK_ID || 'unknown';
  const message = !found
    ? (process.env.DISCOVER_MESSAGE || 'Plan manifest not found.')
    : (aiOk ? `AI plan synthesis completed for task ${taskId}.` : (process.env.AI_MESSAGE || 'AI synthesis failed.'));

  const prNumber = Number(process.env.PR_NUMBER || context.payload.pull_request?.number || 0);
  if (!prNumber) {
    console.log('No PR number available; skipping pickup check run publication.');
    return;
  }

  const pr = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
  });

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'Plan Generated by Agent',
    head_sha: pr.data.head.sha,
    status: 'completed',
    conclusion: (found && aiOk) ? 'success' : 'failure',
    output: {
      title: (found && aiOk) ? 'Plan agent pickup completed' : 'Plan agent pickup failed',
      summary: message,
      text: (found && aiOk) ? 'The plan branch has been synthesized by an AI planning workflow.' : message,
    },
  });
}

// ---------------------------------------------------------------------------
// Post or update a pickup-status comment on the PR
// ---------------------------------------------------------------------------
async function commentPickupStatus({ github, context, core }) {
  const found = process.env.FOUND === 'true';
  const aiOk = process.env.AI_OK === 'true';
  const taskId = process.env.TASK_ID || '';
  const epicId = process.env.EPIC_ID || '';
  const targetRepo = process.env.TARGET_REPO || '';
  const marker = '<!-- plan-agent-pickup -->';

  const body = (found && aiOk)
    ? [
        marker,
        '✅ **Plan AI synthesis completed**',
        '',
        `- Task: \`${taskId}\``,
        `- Epic: \`${epicId}\``,
        `- Target repo: \`${targetRepo}\``,
        '- Check run: `Plan Generated by Agent`',
        '- Model source: GitHub Models (`openai/gpt-4o`)',
      ].join('\n')
    : [
        marker,
        '❌ **Plan agent pickup failed**',
        '',
        found ? (process.env.AI_MESSAGE || 'AI synthesis failed.') : (process.env.DISCOVER_MESSAGE || 'Plan manifest not found.'),
      ].join('\n');

  const prNumber = Number(process.env.PR_NUMBER || context.payload.pull_request?.number || 0);
  if (!prNumber) {
    console.log('No PR number available; skipping pickup status comment.');
    return;
  }
  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });

  const existing = comments.find(c => c.user.login === 'github-actions[bot]' && c.body.includes(marker));

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body,
    });
  }
}

module.exports = {
  discoverPlanContext,
  synthesizePlanWithAI,
  applyAiSynthesis,
  publishPickupCheck,
  commentPickupStatus,
  buildPlanPrompt,
  upsertFrontmatter,
};
