const { getDeliveryNodeById } = require('../../sync-state/epic-resolver');

const EPIC_PATTERN = /^epic\/[A-Z][A-Z0-9]+-\d+_.+$/;
const PLAN_PATTERN = /^plan\/[A-Z][A-Z0-9]+-\d+_.+$/;
const EXEC_PATTERN = /^(feat|fix|chore|hotfix|refactor|docs|ci)\/[A-Z][A-Z0-9]+-\d+_.+$/;

function detectSddContext(branch, body = '') {
  const isEpicOrPlan = branch.startsWith('epic/') || branch.startsWith('plan/');
  const isExecPattern = EXEC_PATTERN.test(branch);
  const hasSddMetadata = /Epic ID:|Task ID:|Hub plan PR:|Target repo PR:|\.sdd\/context\.yaml/.test(body);
  const isSdd = isEpicOrPlan || (isExecPattern && hasSddMetadata);

  let branchType = 'unknown';
  if (branch.startsWith('epic/')) branchType = 'epic';
  else if (branch.startsWith('plan/')) branchType = 'plan';
  else if (isExecPattern) branchType = 'execution';

  return { isSdd, branchType, hasSddMetadata, isEpicOrPlan, isExecPattern };
}

function getBranchNamingIssues(branch) {
  const issues = [];
  let branchType = 'unknown';

  if (branch.startsWith('epic/')) {
    branchType = 'epic';
    if (!EPIC_PATTERN.test(branch)) {
      issues.push('Does not match `epic/<TICKET-ID>_<description>`. Example: `epic/PROJ-123_add-feature`');
    }
  } else if (branch.startsWith('plan/')) {
    branchType = 'plan';
    if (!PLAN_PATTERN.test(branch)) {
      issues.push('Does not match `plan/<TICKET-ID>_<description>`. Example: `plan/PROJ-456_implement`');
    }
  } else if (/^(feat|fix|chore|hotfix|refactor|docs|ci)\//.test(branch)) {
    branchType = 'execution';
    if (!EXEC_PATTERN.test(branch)) {
      issues.push('Does not match `<type>/<TICKET-ID>_<description>`. Example: `feat/PROJ-789_add-endpoint`');
    }
  }

  return { branchType, issues };
}

function getCrossReferenceIssues({ projectRoot = process.cwd(), branch, body, branchType }) {
  const epicMatch = body.match(/\*\*Epic ID:\*\*\s*([^\n]+)/);
  const taskMatch = body.match(/\*\*Task ID:\*\*\s*([^\n]+)/);
  const branchTask = branch.startsWith('plan/') ? (branch.replace(/^plan\//, '').split(/[_-]/)[0] || '') : '';
  const epicId = epicMatch ? epicMatch[1].trim() : '';
  const taskId = taskMatch ? taskMatch[1].trim() : branchTask;
  const node = epicId && taskId ? getDeliveryNodeById(projectRoot, epicId, taskId) : null;
  const targetRepoLinkPublished = !!(node && node.pr_url);

  const issues = [];

  if (branchType === 'plan') {
    if (targetRepoLinkPublished && !/\*\*Target repo PR:\*\*/.test(body)) {
      issues.push('Missing `**Target repo PR:** <org>/<repo>#<number>`');
    }
  }

  if (branchType === 'execution') {
    if (!/\*\*Hub plan PR:\*\*/.test(body)) {
      issues.push('Missing `**Hub plan PR:** <org>/<hub-repo>#<number>`');
    }
    if (!/Epic ID:\s*[^\n]+/.test(body)) {
      issues.push('Missing `Epic ID:` field');
    }
    if (!/Task ID:\s*[^\n]+/.test(body)) {
      issues.push('Missing `Task ID:` field');
    }
  }

  return { epicId, taskId, targetRepoLinkPublished, issues };
}

function getBlastRadiusIssues({ branchType, changedPaths }) {
  const annotations = [];
  const findings = [];
  const hubTrackingPaths = ['epics/', 'agent-development/', 'fallback-sdd/', 'documentation/', '.github/'];

  if (branchType === 'plan') {
    const unexpected = changedPaths.filter((f) =>
      !hubTrackingPaths.some((p) => f.startsWith(p)) &&
      !f.startsWith('.sdd') &&
      f !== '.gitignore'
    );

    if (unexpected.length > 0) {
      findings.push(`${unexpected.length} file(s) outside expected hub tracking paths`);
      for (const f of unexpected.slice(0, 5)) {
        annotations.push({
          path: f,
          start_line: 1,
          end_line: 1,
          annotation_level: 'warning',
          message: 'Plan branches should only modify hub tracking files',
          title: 'Blast radius',
        });
      }
    }
  }

  if (branchType === 'execution') {
    const nonCodeFiles = changedPaths.filter((f) =>
      f.startsWith('epics/') || f.startsWith('fallback-sdd/') || f.startsWith('agent-development/')
    );
    if (nonCodeFiles.length > 0) {
      findings.push(`${nonCodeFiles.length} hub tracking file(s) found in execution branch`);
      for (const f of nonCodeFiles.slice(0, 5)) {
        annotations.push({
          path: f,
          start_line: 1,
          end_line: 1,
          annotation_level: 'warning',
          message: 'Execution branches should not modify hub tracking files',
          title: 'Blast radius',
        });
      }
    }
  }

  return { findings, annotations };
}

module.exports = {
  detectSddContext,
  getBranchNamingIssues,
  getCrossReferenceIssues,
  getBlastRadiusIssues,
};
