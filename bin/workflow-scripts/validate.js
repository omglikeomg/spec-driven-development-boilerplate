const fs = require('fs');
const path = require('path');
const { detectSddContext, getBranchNamingIssues, getCrossReferenceIssues } = require('./_shared/sdd');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '_templates') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, fileList);
    } else {
      fileList.push(full);
    }
  }
  return fileList;
}

async function validateYamlAndFrontmatter({ github, context, core }) {
  const errors = [];
  const changedFiles = [];
  const prFiles = await github.paginate(github.rest.pulls.listFiles, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number,
    per_page: 100,
  });
  for (const file of prFiles) {
    changedFiles.push(file.filename);
  }

  for (const file of changedFiles) {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file).toLowerCase();
    if (!['.yml', '.yaml', '.md'].includes(ext) && basename !== 'manifest.yaml') continue;
    if (!fs.existsSync(file)) continue;

    try {
      const text = fs.readFileSync(file, 'utf8');

      if (file.endsWith('manifest.yaml') && !file.includes('/_templates/')) {
        const requiredFields = ['plan_metadata', 'task_id', 'task_name', 'status'];
        for (const field of requiredFields) {
          if (!text.includes(`${field}:`)) {
            errors.push(`${file}: missing required field '${field}'`);
          }
        }
        const statusMatch = text.match(/status:\s*([^\n\s#]+)/);
        if (statusMatch) {
          const validStatuses = ['draft', 'pending-approval', 'approved', 'in-progress', 'done', 'failed', 'paused'];
          if (!validStatuses.includes(statusMatch[1])) {
            errors.push(`${file}: invalid status '${statusMatch[1]}'. Valid: ${validStatuses.join(', ')}`);
          }
        }
      }

      if (file.endsWith('.md') && (file.includes('epics/') || file.includes('fallback-sdd/') || file.includes('agent-development/'))) {
        const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const frontmatter = fmMatch[1];
          if (!/^[A-Za-z0-9_]+:\s/.test(frontmatter.trim().split('\n')[0])) {
            errors.push(`${file}: frontmatter appears malformed`);
          }
        }
      }

      if (file.endsWith('delivery.yaml')) {
        if (!text.includes('nodes:') && !text.includes('nodes: []')) {
          errors.push(`${file}: delivery.yaml missing 'nodes' section`);
        }
        if (!text.includes('epic_id:')) {
          errors.push(`${file}: delivery.yaml missing 'epic_id' field`);
        }
      }
    } catch (err) {
      errors.push(`${file}: failed to read — ${err.message}`);
    }
  }

  if (errors.length > 0) {
    core.setFailed(`${errors.length} validation error(s) found.`);
  }
}

async function detectSddContextStep({ context, core }) {
  const branch = context.payload.pull_request.head.ref;
  const body = context.payload.pull_request.body || '';
  const { isSdd, branchType } = detectSddContext(branch, body);
  core.setOutput('is_sdd', String(isSdd));
  core.info(`SDD context: ${isSdd ? 'yes' : 'no'} (branch: ${branch})`);
  core.setOutput('branch_type', branchType);
}

async function validateBranchNamingOnPR({ context, core }) {
  const branch = context.payload.pull_request.head.ref;
  if (branch.startsWith('main') || branch.startsWith('master')) {
    return;
  }
  const { branchType, issues } = getBranchNamingIssues(branch);
  core.setOutput('branch_type', branchType);
  for (const issue of issues) {
    core.warning(issue);
  }
}

async function validateCrossReferencesOnHubPRs({ context, core }) {
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

  for (const issue of issues) {
    core.warning(issue);
  }
}

module.exports = {
  walk,
  validateYamlAndFrontmatter,
  detectSddContextStep,
  validateBranchNamingOnPR,
  validateCrossReferencesOnHubPRs,
};
