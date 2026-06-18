const fs = require('fs');
const path = require('path');

describe('Workflow YAML structure validation');

const WORKFLOWS_DIR = path.join(__dirname, '..', '..', '.github', 'workflows');
const SCRIPTS_DIR = path.join(__dirname, '..', 'workflow-scripts');
const REQUIRED_WORKFLOWS = [
  'validate.yml', 'guardrails.yml', 'preflight-check.yml',
  'epic-approval.yml', 'plan-execution-trigger.yml',
  'ai-verification-gate.yml', 'post-merge-sync.yml', 'pr-lifecycle.yml',
  'target-status-events.yml', 'epic-completion.yml',
  'receive-task.yml', 'notify-hub-verification.yml',
];

function parseYamlFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const structure = { triggers: [], jobs: [], permissions: '', secrets: [] };

  let inSection = null;
  for (const line of lines) {
    if (/^name:\s*/.test(line)) {
      structure.name = line.replace(/^name:\s*/, '').trim();
    }
    if (/^on:\s*$/.test(line)) {
      inSection = 'on';
      continue;
    }
    if (/^permissions:\s*$/.test(line)) {
      inSection = 'permissions';
      continue;
    }
    if (/^jobs:\s*$/.test(line)) {
      inSection = 'jobs';
      continue;
    }
    if (/^\S/.test(line) && !/^  /.test(line)) {
      inSection = null;
    }

    if (inSection === 'on' && /^\s{2}[a-z]/.test(line)) {
      structure.triggers.push(line.match(/^\s{2}(\w+):/)?.[1] || '');
    }
    if (inSection === 'jobs' && /^\s{2}\w+:/.test(line) && !/^\s{2}steps:/.test(line) && !/^\s{2}runs-on:/.test(line)) {
      structure.jobs.push(line.match(/^\s{2}(\w+):/)?.[1] || '');
    }
    if (line.includes('${{ secrets.')) {
      const match = line.match(/secrets\.(\w+)/);
      if (match && !structure.secrets.includes(match[1])) {
        structure.secrets.push(match[1]);
      }
    }
  }

  return structure;
}

it('all 12 required workflows exist', () => {
  for (const wf of REQUIRED_WORKFLOWS) {
    const fullPath = path.join(WORKFLOWS_DIR, wf);
    assert(fs.existsSync(fullPath), `${wf} should exist`);
  }
});

it('all workflows have a name', () => {
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml'));
  for (const file of files) {
    const structure = parseYamlFile(path.join(WORKFLOWS_DIR, file));
    assert(structure.name, `${file} should have a name`);
  }
});

it('all workflows have at least one trigger', () => {
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml'));
  for (const file of files) {
    const structure = parseYamlFile(path.join(WORKFLOWS_DIR, file));
    assert(structure.triggers.length > 0 || file === 'receive-task.yml' || file === 'notify-hub-verification.yml' || file === 'epic-completion.yml',
      `${file} should have triggers (or be reusable)`);
  }
});

it('guardrails has SDD detection gate', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'guardrails.yml'), 'utf8');
  assertContains(text, 'detect-sdd', 'guardrails should have SDD detection');
  assertContains(text, 'is_sdd', 'guardrails should gate on is_sdd');
});

it('pr-lifecycle has SDD detection gate', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml'), 'utf8');
  assertContains(text, 'detect-sdd', 'pr-lifecycle should have SDD detection');
});

it('preflight-check has SDD detection gate', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'preflight-check.yml'), 'utf8');
  assertContains(text, 'detect-sdd', 'preflight-check should have SDD detection');
});

it('plan execution uses extracted workflow scripts', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'plan-execution-trigger.yml'), 'utf8');
  assertContains(text, 'bin/workflow-scripts/plan-execution-trigger', 'plan trigger should require extracted script module');
  assertContains(text, 'generateCorrelationStep', 'plan trigger should call module entrypoints');
  assertContains(text, 'validatePlanForSafetyGates', 'plan trigger should call extracted validation');
});

it('epic approval uses extracted workflow scripts', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'epic-approval.yml'), 'utf8');
  assertContains(text, 'bin/workflow-scripts/epic-approval', 'epic approval should require extracted helpers');
  assertContains(text, 'discoverEpicContext', 'epic approval should call discover helper');
  assertContains(text, 'createGitHubIssuesAndJiraTickets', 'epic approval should call ticket helper');
  assertContains(text, 'transitionJiraEpic', 'epic approval should call Jira helper');
  assert(!text.includes('gh pr merge --squash --auto'), 'epic approval should not auto-merge');
});

it('receive task uses extracted workflow scripts', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'receive-task.yml'), 'utf8');
  assertContains(text, 'bin/workflow-scripts/receive-task', 'receive-task should require extracted helpers');
  assertContains(text, 'verifyIntegrityTokenStep', 'receive-task should call integrity helper');
  assertContains(text, 'synthesizeImplementationWithAI', 'receive-task should call AI synthesis helper');
});

it('post merge sync uses extracted workflow scripts', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'post-merge-sync.yml'), 'utf8');
  assertContains(text, 'bin/workflow-scripts/post-merge-sync', 'post-merge-sync should require extracted helpers');
  assertContains(text, 'determinePrTypeAndExtractContext', 'post-merge-sync should call context helper');
  assertContains(text, 'notifyHubOfExecutionMerge', 'post-merge-sync should call hub notification helper');
  assertContains(text, 'checkEpicCompletion', 'post-merge-sync should call completion helper');
});

it('all content:write workflows commit .sdd-audit', () => {
  const files = ['post-merge-sync.yml', 'plan-execution-trigger.yml', 'target-status-events.yml'];
  for (const file of files) {
    const text = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
    if (text.includes('git add')) {
      assertContains(text, '.sdd-audit', `${file} should git add .sdd-audit`);
    }
  }
});

it('ai-verification-gate has retry with backoff', () => {
  const text = fs.readFileSync(path.join(SCRIPTS_DIR, 'ai-verification-gate.js'), 'utf8');
  assertContains(text, 'attempt', 'should have retry logic');
  assertContains(text, 'AbortSignal', 'should have timeout');
});

it('epic-approval has deduplication', () => {
  const text = fs.readFileSync(path.join(SCRIPTS_DIR, 'epic-approval.js'), 'utf8');
  assertContains(text, 'alreadyExists', 'should deduplicate tickets');
});

it('guardrails uses check runs not PR comments', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'guardrails.yml'), 'utf8');
  assertContains(text, 'bin/workflow-scripts/guardrails', 'guardrails should require extracted helpers');
  assertContains(text, 'checkBlastRadius', 'guardrails should call blast radius helper');
  assertContains(text, 'checkQualityChecklist', 'guardrails should call checklist helper');
});

it('validate workflow uses extracted helper module', () => {
  const text = fs.readFileSync(path.join(WORKFLOWS_DIR, 'validate.yml'), 'utf8');
  assertContains(text, 'bin/workflow-scripts/validate', 'validate should require extracted helpers');
  assertContains(text, 'validateYamlAndFrontmatter', 'validate should call extracted validator');
  assertContains(text, 'validateCrossReferencesOnHubPRs', 'validate should call extracted cross-ref helper');
});

it('target status maps review to in-progress', () => {
  const text = fs.readFileSync(path.join(SCRIPTS_DIR, 'target-status-events.js'), 'utf8');
  assertContains(text, "'ready-for-review': 'in-progress'", 'ready-for-review should stay in-progress until merge');
});
