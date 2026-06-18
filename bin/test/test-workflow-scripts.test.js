const { slugify } = require('../workflow-scripts/_shared/config');
const { detectSddContext, getBranchNamingIssues, getBlastRadiusIssues } = require('../workflow-scripts/_shared/sdd');
const epicApproval = require('../workflow-scripts/epic-approval');
const receiveTask = require('../workflow-scripts/receive-task');
const postMergeSync = require('../workflow-scripts/post-merge-sync');

describe('workflow script helpers');

it('slugify normalizes branch fragments', () => {
  assertEqual(slugify('Hello World!'), 'hello-world');
  assertEqual(slugify('plan/PROJ-1_add-stuff'), 'plan-proj-1-add-stuff');
});

it('detectSddContext identifies epic and execution branches', () => {
  const epic = detectSddContext('epic/PROJ-1_feature', '');
  assertEqual(epic.branchType, 'epic');
  assertEqual(epic.isSdd, true);

  const exec = detectSddContext('feat/PROJ-1_feature', '**Epic ID:** PROJ-1');
  assertEqual(exec.branchType, 'execution');
  assertEqual(exec.isSdd, true);
});

it('getBranchNamingIssues reports invalid names', () => {
  const result = getBranchNamingIssues('feat/bad-branch');
  assertEqual(result.branchType, 'execution');
  assert(result.issues.length > 0, 'should report issues');
});

it('getBlastRadiusIssues flags unexpected files', () => {
  const result = getBlastRadiusIssues({
    branchType: 'plan',
    changedPaths: ['src/app.js', 'epics/foo/task-graph.md'],
  });
  assert(result.findings.length > 0, 'should report findings');
});

it('workflow modules export the extracted entry points', () => {
  assertEqual(typeof epicApproval.discoverEpicContext, 'function');
  assertEqual(typeof epicApproval.createGitHubIssuesAndJiraTickets, 'function');
  assertEqual(typeof receiveTask.verifyIntegrityTokenStep, 'function');
  assertEqual(typeof receiveTask.synthesizeImplementationWithAI, 'function');
  assertEqual(typeof postMergeSync.determinePrTypeAndExtractContext, 'function');
  assertEqual(typeof postMergeSync.notifyHubOfExecutionMerge, 'function');
});
