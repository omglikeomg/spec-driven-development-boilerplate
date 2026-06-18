'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readText, splitMarkdownFrontmatter } = require('../sync-state/_common');

// ---------------------------------------------------------------------------
// Pre-check: parse payload, resolve plan, detect blast-radius issues
// ---------------------------------------------------------------------------
async function runPrecheck({ github, context, core }) {
  const payload = context.payload.client_payload || {};
  const childRepoFull = payload.repository || payload.repo || payload.target_repo_full_name;

  if (!childRepoFull || !payload.pr_number) {
    core.setOutput('skip', 'true');
    core.setOutput('reason', 'Missing repository or pr_number in payload.');
    return;
  }

  const [childOwner, childRepo] = childRepoFull.split('/');
  const prNumber = Number(payload.pr_number);
  const epicId = String(payload.epic_id || '');
  const taskId = String(payload.task_id || '');

  core.setOutput('child_owner', childOwner);
  core.setOutput('child_repo', childRepo);
  core.setOutput('pr_number', String(prNumber));
  core.setOutput('epic_id', epicId);
  core.setOutput('task_id', taskId);
  core.setOutput('branch', String(payload.branch || ''));

  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner: childOwner, repo: childRepo, pull_number: prNumber, per_page: 100,
  });

  const changedFiles = files.map(f => f.filename);
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  core.setOutput('changed_file_count', String(changedFiles.length));
  core.setOutput('total_additions', String(totalAdditions));
  core.setOutput('total_deletions', String(totalDeletions));

  if (changedFiles.length === 0) {
    core.setOutput('skip', 'true');
    core.setOutput('reason', 'No files changed. Skipping verification.');
    return;
  }

  const isConfigOnly = changedFiles.every(f =>
    f.endsWith('.yml') || f.endsWith('.yaml') || f.endsWith('.json') ||
    f.endsWith('.md') || f.startsWith('.github/') || f.startsWith('.sdd/') || f === '.gitignore'
  );

  if (isConfigOnly && totalAdditions < 50) {
    core.setOutput('skip', 'true');
    core.setOutput('reason', 'Configuration-only change. Skipping AI verification.');
    core.setOutput('config_only', 'true');
    return;
  }

  core.setOutput('skip', 'false');

  let planDir = '';
  try {
    planDir = execFileSync('node', ['bin/sync-state.js', 'find-plan', epicId, taskId], {
      encoding: 'utf8', timeout: 15000,
    }).trim();
  } catch (_) {}

  if (!planDir) {
    core.setOutput('skip', 'true');
    core.setOutput('reason', 'No plan manifest found for this task. Skipping AI verification.');
    return;
  }

  const planManifest = path.join(planDir, 'manifest.yaml');
  core.setOutput('plan_manifest', planManifest);

  if (!fs.existsSync(planManifest)) return;

  const manifestText = fs.readFileSync(planManifest, 'utf8');
  const declaredFiles = [];
  for (const line of manifestText.split('\n')) {
    const cm = line.match(/context_files:\s*\[(.*?)\]/);
    if (cm) declaredFiles.push(...cm[1].split(',').map(s => s.trim().replace(/['"]/g, '')));
    const om = line.match(/output_files:\s*\[(.*?)\]/);
    if (om) declaredFiles.push(...om[1].split(',').map(s => s.trim().replace(/['"]/g, '')));
  }

  const normalized = [...new Set(declaredFiles.map(f => f.replace(/^\//, '')).filter(Boolean))];
  if (normalized.length === 0) return;

  const unexpected = changedFiles.filter(f => {
    const norm = f.replace(/^\//, '');
    return !normalized.some(d => norm.includes(d) || d.includes(norm));
  });

  if (unexpected.length > 0) {
    core.setOutput('blast_radius_issue', 'true');
    core.setOutput('unexpected_files', unexpected.join(', '));
    core.setOutput('declared_files', normalized.join(', '));
  }
}

// ---------------------------------------------------------------------------
// Post a comment explaining why verification was skipped
// ---------------------------------------------------------------------------
async function postSkipComment({ github, core, inputs = {} }) {
  const { childOwner, childRepo, prNumber, reason } = inputs;
  if (!childOwner || !childRepo || !prNumber) return;

  await github.rest.issues.createComment({
    owner: childOwner,
    repo: childRepo,
    issue_number: Number(prNumber),
    body: [
      'Verification skipped.',
      '',
      `**Reason:** ${reason || 'Insufficient context for AI verification.'}`,
    ].join('\n'),
  });
}

// ---------------------------------------------------------------------------
// AI verification: build prompt, call model, post comment, update status
// ---------------------------------------------------------------------------
async function runAiVerification({ github, context, core, inputs = {} }) {
  const {
    childOwner, childRepo, prNumber, epicId, taskId, planManifest,
    blastRadiusIssue, unexpectedFiles, declaredFiles, branch,
  } = inputs;

  function bodyOnly(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const split = splitMarkdownFrontmatter(readText(filePath));
    return split.bodyLines.join('\n').trim();
  }

  let epicDir = '';
  try {
    epicDir = execFileSync('node', ['bin/sync-state.js', 'find-epic', epicId], {
      encoding: 'utf8', timeout: 10000,
    }).trim();
  } catch (_) {}

  const maxChars = Number(process.env.MAX_CONTEXT_CHARS) || 8000;
  const epicFile = epicDir ? path.join(epicDir, 'epic.md') : '';
  const taskGraphPath = epicDir ? path.join(epicDir, 'task-graph.md') : '';
  const planSpec = planManifest ? path.join(path.dirname(planManifest), 'specification.md') : '';

  const [pr, files] = await Promise.all([
    github.rest.pulls.get({ owner: childOwner, repo: childRepo, pull_number: Number(prNumber) }),
    github.paginate(github.rest.pulls.listFiles, {
      owner: childOwner, repo: childRepo, pull_number: Number(prNumber), per_page: 100,
    }),
  ]);

  const diffSummary = files.slice(0, 25)
    .map(f => `- ${f.filename} (+${f.additions}/-${f.deletions})${f.patch ? `\n${f.patch.slice(0, 1500)}` : ''}`)
    .join('\n\n');

  const prompt = buildVerificationPrompt({
    epicId, taskId, planManifest, planSpec, epicFile, taskGraphPath,
    pr: pr.data, diffSummary, blastRadiusIssue, unexpectedFiles, declaredFiles, maxChars,
  });

  const verdict = await callGitHubModels(prompt);

  if (!verdict) {
    core.setOutput('api_error', 'true');
    await github.rest.issues.createComment({
      owner: childOwner, repo: childRepo, issue_number: Number(prNumber),
      body: [
        'Verification skipped — AI model API unavailable after 3 attempts.',
        '',
        'The PR was not blocked. A human reviewer should verify alignment manually.',
      ].join('\n'),
    });
    return;
  }

  await postVerificationComment({ github, childOwner, childRepo, prNumber, verdict, blastRadiusIssue, unexpectedFiles, declaredFiles });
  await updateTaskStatusAfterVerification({ epicId, taskId, pr: pr.data, prNumber, branch });

  commitStatusUpdate({ epicId, taskId });
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable)
// ---------------------------------------------------------------------------
function buildVerificationPrompt({ epicId, planManifest, planSpec, epicFile, taskGraphPath, pr, diffSummary, blastRadiusIssue, unexpectedFiles, declaredFiles, maxChars = 8000 }) {
  function bodyOnly(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const split = splitMarkdownFrontmatter(readText(filePath));
    return split.bodyLines.join('\n').trim();
  }

  const parts = [
    'You are an SDD verification gate. Compare the child repo PR diff against the epic and the implementation plan.',
    'Return strict JSON only: { "verdict": "aligned" | "off_track", "summary": "1-2 sentence assessment", "deviations": ["..."], "recommended_actions": [...] }',
    '',
    `## Epic (${epicId})`,
    epicFile ? bodyOnly(epicFile).slice(0, maxChars) : '(no epic content available)',
    '',
    '## Task Graph',
    (taskGraphPath && fs.existsSync(taskGraphPath)) ? bodyOnly(taskGraphPath).slice(0, maxChars) : '(no task graph available)',
    '',
    '## Plan Manifest',
    (planManifest && fs.existsSync(planManifest)) ? readText(planManifest).slice(0, maxChars) : '(no manifest available)',
    '',
    '## Plan Specification',
    (planSpec && fs.existsSync(planSpec)) ? readText(planSpec).slice(0, maxChars) : '(no specification available)',
  ];

  if (blastRadiusIssue === 'true') {
    parts.push(
      '', '## Blast Radius Warning',
      `Files outside plan scope: ${unexpectedFiles}`,
      `Declared scope: ${declaredFiles}`,
      'Check whether the unexpected files are justified additions or scope creep.',
    );
  }

  parts.push(
    '', `## Child PR`,
    `Title: ${pr.title}`,
    `Body: ${(pr.body || '').slice(0, 2000)}`,
    '', '## Changed Files', diffSummary,
  );

  return parts.join('\n');
}

async function callGitHubModels(prompt) {
  const modelUrl = 'https://models.github.ai/inference/chat/completions';
  const delays = [10000, 30000];

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(modelUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-4o',
          messages: [
            { role: 'system', content: 'You are a strict implementation reviewer. Respond with valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 1400,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = (await response.json()).choices?.[0]?.message?.content || '';

      try {
        return JSON.parse(raw);
      } catch (_) {
        return {
          verdict: 'off_track',
          summary: raw || 'Model response was not parseable JSON.',
          deviations: ['Model response was not valid JSON.'],
          recommended_actions: ['Inspect raw model output and rerun verification.'],
        };
      }
    } catch (err) {
      console.log(`Attempt ${attempt}/3 failed: ${err.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, delays[attempt - 1]));
    }
  }

  return null;
}

async function postVerificationComment({ github, childOwner, childRepo, prNumber, verdict, blastRadiusIssue, unexpectedFiles, declaredFiles }) {
  const isAligned = String(verdict.verdict || '').toLowerCase() === 'aligned';
  const deviations = Array.isArray(verdict.deviations) ? verdict.deviations : [];
  const actions = Array.isArray(verdict.recommended_actions) ? verdict.recommended_actions : [];

  const lines = [
    isAligned ? 'Advisory verdict: **aligned with plan**' : 'Advisory verdict: **off track**',
    '',
    verdict.summary ? `**Summary:** ${verdict.summary}` : '',
  ];

  if (blastRadiusIssue === 'true') {
    lines.push(
      '', "**Blast radius note:** Some changed files are outside the plan's declared scope.",
      `Declared: ${declaredFiles}`, `Additional: ${unexpectedFiles}`,
    );
  }

  if (deviations.length) lines.push('', '**Potential deviations:**', ...deviations.map(d => `- ${d}`));
  if (actions.length) lines.push('', '**Suggestions:**', ...actions.map(a => `- ${a}`));
  lines.push('', '_This is an advisory check. It does not block merging. Human review is the final gate._');

  await github.rest.issues.createComment({
    owner: childOwner, repo: childRepo, issue_number: Number(prNumber),
    body: lines.filter(l => l !== null && l !== undefined).join('\n'),
  });
}

async function updateTaskStatusAfterVerification({ epicId, taskId, pr, prNumber, branch }) {
  execFileSync('node', ['bin/sync-state.js', 'update-task', epicId, taskId, 'in-progress'], { stdio: 'inherit' });
  execFileSync('node', [
    'bin/sync-state.js', 'update-pr', epicId, taskId, 'in-progress',
    `--pr-url=${pr.html_url}`,
    `--pr-number=${prNumber}`,
    `--branch=${branch || pr.head.ref || ''}`,
  ], { stdio: 'inherit' });
}

async function openAdvisoryIssue({ github, context, childOwner, childRepo, prNumber, epicId, taskId, verdict }) {
  const deviations = Array.isArray(verdict.deviations) ? verdict.deviations : [];
  const actions = Array.isArray(verdict.recommended_actions) ? verdict.recommended_actions : [];

  await github.rest.issues.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: `Advisory: iteration may be needed — task ${taskId} in ${childOwner}/${childRepo}`,
    body: [
      'The AI verification gate flagged potential deviations from the plan.',
      '',
      `**Child PR:** ${childOwner}/${childRepo}#${prNumber}`,
      `**Epic:** ${epicId}  **Task:** ${taskId}`,
      '',
      '**Model summary:**',
      verdict.summary || 'No summary returned.',
      '',
      '**Flagged deviations:**',
      ...deviations.map(d => `- ${d}`),
      '',
      '**Actions to consider:**',
      ...actions.map(a => `- ${a}`),
      '',
      '_This is an advisory issue. Close it if the deviations are intentional._',
    ].join('\n'),
    labels: ['advisory-iteration'],
  });
}

function commitStatusUpdate({ epicId, taskId }) {
  try {
    if (!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) return;
    execFileSync('git', ['config', 'user.name', 'github-actions[bot]']);
    execFileSync('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
    const branch = process.env.GITHUB_REF_NAME || 'main';
    execFileSync('git', ['add', '-A']);
    execFileSync('git', ['commit', '-m', `chore(status): verify task ${taskId}`]);
    execFileSync('git', ['push', 'origin', `HEAD:${branch}`]);
  } catch (err) {
    console.warn(`Git commit skipped: ${err.message}`);
  }
}

module.exports = {
  runPrecheck,
  postSkipComment,
  runAiVerification,
  buildVerificationPrompt,
  callGitHubModels,
  postVerificationComment,
};
