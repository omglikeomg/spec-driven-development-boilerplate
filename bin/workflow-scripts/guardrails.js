const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { detectSddContext, getBranchNamingIssues, getCrossReferenceIssues, getBlastRadiusIssues } = require('./_shared/sdd');

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '_templates') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(full);
      walk(full, results);
    }
  }
  return results;
}

async function detectSddStep({ context, core }) {
  const branch = context.payload.pull_request.head.ref;
  const body = context.payload.pull_request.body || '';
  const { isSdd, branchType } = detectSddContext(branch, body);

  core.setOutput('is_sdd', String(isSdd));
  core.setOutput('branch_type', branchType);

  if (!isSdd) {
    console.log('Non-SDD PR detected. All guardrails will be skipped.');
    console.log(`  Branch: ${branch}`);
    console.log(`  Has SDD metadata: ${body.includes('Epic ID:') || body.includes('Task ID:')}`);
  } else {
    console.log(`SDD PR detected. Branch type: ${branchType}`);
  }
}

async function checkBranchNaming({ github, context, core }) {
  const branch = context.payload.pull_request.head.ref;
  const { branchType, issues } = getBranchNamingIssues(branch);
  core.setOutput('branch_type', branchType);

  const annotations = issues.map((msg) => ({
    path: 'branch',
    start_line: 1,
    end_line: 1,
    annotation_level: 'warning',
    message: msg,
    title: 'Branch naming',
  }));

  const conclusion = issues.length > 0 ? 'neutral' : 'success';
  const title = issues.length > 0 ? `Branch "${branch}" — ${issues.length} advisory` : `Branch "${branch}" — OK`;
  const summary = issues.length > 0
    ? ['**Branch naming advisory**', '', ...issues.map((i) => `- ${i}`), '', 'See `common-specs/git-workflow.md` for conventions.'].join('\n')
    : 'Branch naming follows conventions.';

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'Guardrails: Branch Naming',
    head_sha: context.payload.pull_request.head.sha,
    status: 'completed',
    conclusion,
    output: { title, summary, annotations },
  });
}

async function checkCrossReferences({ github, context, core }) {
  const pr = context.payload.pull_request;
  const body = pr.body || '';
  const branch = pr.head.ref;
  const branchType = branch.startsWith('plan/') ? 'plan' : branch.startsWith('epic/') ? 'epic' : 'execution';
  const { issues } = getCrossReferenceIssues({
    projectRoot: process.cwd(),
    branch,
    body,
    branchType,
  });

  if (branchType === 'unknown' || issues.length === 0) {
    return;
  }

  const annotations = issues.map((msg) => ({
    path: 'PR description',
    start_line: 1,
    end_line: 1,
    annotation_level: 'warning',
    message: msg,
    title: 'Cross-reference',
  }));

  const conclusion = issues.length > 0 ? 'neutral' : 'success';
  const title = issues.length > 0 ? `${issues.length} cross-reference issue(s)` : 'Cross-references OK';
  const summary = issues.length > 0
    ? ['**Cross-reference advisory**', '', ...issues.map((f) => `- ${f}`), '', 'See `common-specs/pr-conventions.md`.'].join('\n')
    : 'PR cross-references are present.';

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'Guardrails: Cross-References',
    head_sha: pr.head.sha,
    status: 'completed',
    conclusion,
    output: { title, summary, annotations },
  });
}

async function checkBlastRadius({ github, context, core }) {
  const branchType = context.payload.pull_request.head.ref.startsWith('plan/') ? 'plan' : 'execution';
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number,
    per_page: 100,
  });
  const changedPaths = files.map((f) => f.filename);
  const { findings, annotations } = getBlastRadiusIssues({ branchType, changedPaths });

  if (changedPaths.length === 0) {
    return;
  }

  const conclusion = findings.length > 0 ? 'neutral' : 'success';
  const title = findings.length > 0
    ? `${findings.length} blast radius advisory`
    : `Blast radius OK (${changedPaths.length} files)`;
  const summary = findings.length > 0
    ? ['**Blast radius advisory**', '', ...findings.map((f) => `- ${f}`), '', 'See `common-specs/git-workflow.md`.'].join('\n')
    : `Changed files stay within the expected ${branchType} scope.`;

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'Guardrails: Blast Radius',
    head_sha: context.payload.pull_request.head.sha,
    status: 'completed',
    conclusion,
    output: { title, summary, annotations },
  });
}

async function checkTitleConvention({ github, context }) {
  const title = context.payload.pull_request.title || '';
  const branch = context.payload.pull_request.head.ref;
  const issues = [];

  const isConventional = /^(feat|fix|chore|hotfix|refactor|docs|ci)(\(.+\))?:\s/.test(title);
  const hasTicketId = /\[[A-Z][A-Z0-9]+-\d+\]/.test(title);

  if (!isConventional && title.length > 0) {
    issues.push('Does not follow conventional commit: `<type>(<scope>): <description>`');
  }

  const execPrefixes = ['feat/', 'fix/', 'chore/', 'hotfix/', 'refactor/', 'docs/', 'ci/'];
  const isExec = execPrefixes.some((p) => branch.startsWith(p));
  if (isExec && !hasTicketId) {
    issues.push('Missing ticket ID: `<type>(<scope>): <description> [TICKET-ID]`');
  }

  const annotations = issues.map((msg) => ({
    path: 'PR title',
    start_line: 1,
    end_line: 1,
    annotation_level: 'warning',
    message: msg,
    title: 'Title convention',
  }));

  const conclusion = issues.length > 0 ? 'neutral' : 'success';
  const sTitle = issues.length > 0 ? `${issues.length} title convention issue(s)` : 'Title OK';
  const summary = issues.length > 0
    ? ['**PR title convention advisory**', '', ...issues.map((i) => `- ${i}`), '', 'See `common-specs/pr-conventions.md`.'].join('\n')
    : 'PR title follows conventions.';

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'Guardrails: Title Convention',
    head_sha: context.payload.pull_request.head.sha,
    status: 'completed',
    conclusion,
    output: { title: sTitle, summary, annotations },
  });
}

async function checkQualityChecklist({ github, context }) {
  const roots = ['agent-development/plans', 'fallback-sdd'];
  const annotations = [];
  let foundChecklists = 0;
  let incompleteChecklists = 0;

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of walk(root)) {
      const manifest = path.join(dir, 'manifest.yaml');
      if (!fs.existsSync(manifest)) continue;
      const text = fs.readFileSync(manifest, 'utf8');
      if (!text.includes('checklist:')) continue;

      foundChecklists += 1;
      try {
        const result = JSON.parse(execFileSync('node', ['bin/sync-state.js', 'checklist', manifest], { encoding: 'utf8' }));
        if (!result.passed) {
          incompleteChecklists += 1;
          for (const item of result.checklist.unchecked) {
            annotations.push({
              path: manifest.replace(process.cwd() + '/', ''),
              start_line: 1,
              end_line: 1,
              annotation_level: 'warning',
              message: `Unchecked: ${item}`,
              title: 'Quality checklist',
            });
          }
        }
      } catch {
        // checklist command exits 1 on incomplete — that's expected
      }
    }
  }

  const conclusion = incompleteChecklists > 0 ? 'neutral' : 'success';
  const title = incompleteChecklists > 0
    ? `${incompleteChecklists} plan(s) with incomplete checklists`
    : foundChecklists > 0
      ? `All ${foundChecklists} checklist(s) complete`
      : 'No checklists found';

  const summary = incompleteChecklists > 0
    ? [
        '**Quality checklist advisory**',
        '',
        `${incompleteChecklists} plan(s) have incomplete quality checklists.`,
        'All checklist items should be verified before marking the plan as ready.',
        '',
        'Run `node bin/sync-state.js checklist <manifest-path>` to check.',
      ].join('\n')
    : foundChecklists > 0
      ? `All ${foundChecklists} plan checklists are fully verified.`
      : 'No plan manifests with checklists were found in this branch.';

  await github.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: 'Guardrails: Quality Checklist',
    head_sha: context.payload.pull_request.head.sha,
    status: 'completed',
    conclusion,
    output: { title, summary, annotations: annotations.slice(0, 50) },
  });
}

module.exports = {
  detectSddStep,
  checkBranchNaming,
  checkCrossReferences,
  checkBlastRadius,
  checkTitleConvention,
  checkQualityChecklist,
};
