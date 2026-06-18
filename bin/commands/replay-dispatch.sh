#!/usr/bin/env bash
# bin/dev replay-dispatch <epic-id> <task-id> — Re-send a missed child dispatch
set -euo pipefail

require_git_repo
require_gh_auth

EPIC_ID="${1:-}"
TASK_ID="${2:-}"

if [[ -z "${EPIC_ID}" || -z "${TASK_ID}" ]]; then
  log_error "Usage: bin/dev replay-dispatch <epic-id> <task-id>"
  echo ""
  echo "  Example: bin/dev replay-dispatch 2 1"
  echo "  Reconstructs the merged plan context and re-sends task-assigned to the target repo."
  exit 1
fi

SDD_ROOT="${SDD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "${SDD_ROOT}"

CONTEXT_TSV="$(
  EPIC_ID="${EPIC_ID}" TASK_ID="${TASK_ID}" node <<'NODE'
const fs = require('fs');
const path = require('path');
const { generateCorrelationId } = require('./bin/sync-state/audit');
const { resolveEpicDirectory, resolvePlanManifest } = require('./bin/sync-state/epic-resolver');
const { readTaskGraphTasks } = require('./bin/sync-state/task-graph');

const projectRoot = process.cwd();
const epicId = String(process.env.EPIC_ID || '');
const taskId = String(process.env.TASK_ID || '');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseRepoFullName(repoKey) {
  const text = fs.readFileSync(path.join(projectRoot, 'config', 'repos.yaml'), 'utf8');
  const lines = text.split(/\r?\n/);
  const escapedKey = repoKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const repoLine = new RegExp(`^\\s{2,}${escapedKey}:\\s*$`);
  let inRepo = false;

  for (const line of lines) {
    if (!inRepo) {
      if (repoLine.test(line)) {
        inRepo = true;
      }
      continue;
    }

    if (/^\S/.test(line)) {
      break;
    }

    const match = line.match(/git_url:\s*["']?([^"']+)["']?/);
    if (match) {
      const repoMatch = match[1].match(/github\.com[/:](.+?)(?:\.git)?$/);
      return repoMatch ? repoMatch[1] : null;
    }
  }

  return null;
}

const epicDir = resolveEpicDirectory(projectRoot, epicId);
if (!epicDir) {
  throw new Error(`Unable to resolve epic directory for epic ${epicId}.`);
}

const taskGraphPath = path.join(epicDir, 'task-graph.md');
const tasks = readTaskGraphTasks(taskGraphPath);
const task = tasks.find((entry) => String(entry.id) === taskId);
if (!task) {
  throw new Error(`Unable to find task ${taskId} in ${taskGraphPath}.`);
}

const requestFileName = task.request_file || '';
const requestFile = requestFileName
  ? path.join(epicDir, 'requests', requestFileName)
  : null;

if (requestFile && !fs.existsSync(requestFile)) {
  throw new Error(`Unable to find request file for task ${taskId}: ${requestFile}`);
}

const planManifest = resolvePlanManifest(projectRoot, epicId, taskId);
if (!planManifest) {
  throw new Error(`Unable to resolve merged plan manifest for epic ${epicId} task ${taskId}.`);
}

const planDir = path.dirname(planManifest);
const taskSlug = slugify(task.title || `task-${taskId}`);
const planBranch = `plan/${taskId}_${taskSlug}`;
const branchTypesMatch = fs.readFileSync(path.join(projectRoot, 'config', 'teams.yaml'), 'utf8').match(/branch_types:\s*\[(.*?)\]/);
const branchType = branchTypesMatch
  ? (branchTypesMatch[1].split(',').map((part) => part.trim().replace(/['"]/g, ''))[0] || 'feat')
  : 'feat';
const executionBranch = `${branchType}/${taskId}_${taskSlug}`;
const targetRepoFullName = parseRepoFullName(String(task.repo || ''));
if (!targetRepoFullName) {
  throw new Error(`Unable to resolve target repo full name for ${task.repo}.`);
}

const correlationId = generateCorrelationId();
const taskName = task.title || `Task ${taskId}`;

process.stdout.write([
  epicId,
  taskId,
  taskName,
  String(task.repo || ''),
  targetRepoFullName,
  planBranch,
  executionBranch,
  planDir,
  correlationId,
].join('\t'));
NODE
)"

IFS=$'\t' read -r EPIC_ID TASK_ID TASK_NAME TARGET_REPO_KEY TARGET_REPO_FULL_NAME PLAN_BRANCH EXECUTION_BRANCH PLAN_DIR CORRELATION_ID <<< "${CONTEXT_TSV}"

HUB_REPO="${HUB_REPO:-$(gh repo view --json nameWithOwner --jq '.nameWithOwner')}"
PLAN_PR_NUMBER="$(gh pr list --repo "${HUB_REPO}" --state merged --head "${PLAN_BRANCH}" --json number --jq '.[0].number // empty')"

if [[ -z "${PLAN_PR_NUMBER}" ]]; then
  log_error "Unable to find merged plan PR for ${PLAN_BRANCH}"
  log_info "Make sure the plan PR was merged before replaying the dispatch."
  exit 1
fi

INTEGRITY_TOKEN="$(
  EPIC_ID="${EPIC_ID}" \
  TASK_ID="${TASK_ID}" \
  TASK_NAME="${TASK_NAME}" \
  HUB_REPO="${HUB_REPO}" \
  PLAN_BRANCH="${PLAN_BRANCH}" \
  PLAN_PR_NUMBER="${PLAN_PR_NUMBER}" \
  PLAN_DIR="${PLAN_DIR}" \
  EXECUTION_BRANCH="${EXECUTION_BRANCH}" \
  CORRELATION_ID="${CORRELATION_ID}" \
  HUB_INTEGRITY_SECRET="${HUB_INTEGRITY_SECRET:-}" \
  node <<'NODE'
const { generateIntegrityToken } = require('./bin/sync-state/audit');

const secret = process.env.HUB_INTEGRITY_SECRET || '';
if (!secret) {
  process.stdout.write('');
  process.exit(0);
}

const payload = {
  epic_id: process.env.EPIC_ID || '',
  task_id: process.env.TASK_ID || '',
  task_name: process.env.TASK_NAME || '',
  hub_repo: process.env.HUB_REPO || '',
  plan_branch: process.env.PLAN_BRANCH || '',
  plan_pr_number: process.env.PLAN_PR_NUMBER || '',
  plan_dir: process.env.PLAN_DIR || '',
  execution_branch: process.env.EXECUTION_BRANCH || '',
  correlation_id: process.env.CORRELATION_ID || '',
};

process.stdout.write(generateIntegrityToken(secret, payload));
NODE
)"

log_step "Replaying task dispatch"
log_info "Epic: ${EPIC_ID}"
log_info "Task: ${TASK_ID} - ${TASK_NAME}"
log_info "Target repo: ${TARGET_REPO_FULL_NAME}"
log_info "Plan PR: #${PLAN_PR_NUMBER}"
log_info "Execution branch: ${EXECUTION_BRANCH}"

dispatch_args=(
  api
  -X POST
  "repos/${TARGET_REPO_FULL_NAME}/dispatches"
  -f "event_type=task-assigned"
  -f "client_payload[epic_id]=${EPIC_ID}"
  -f "client_payload[task_id]=${TASK_ID}"
  -f "client_payload[task_name]=${TASK_NAME}"
  -f "client_payload[hub_repo]=${HUB_REPO}"
  -f "client_payload[plan_branch]=${PLAN_BRANCH}"
  -f "client_payload[plan_pr_number]=${PLAN_PR_NUMBER}"
  -f "client_payload[plan_dir]=${PLAN_DIR}"
  -f "client_payload[execution_branch]=${EXECUTION_BRANCH}"
  -f "client_payload[correlation_id]=${CORRELATION_ID}"
)

if [[ -n "${INTEGRITY_TOKEN}" ]]; then
  dispatch_args+=("-f" "client_payload[integrity_token]=${INTEGRITY_TOKEN}")
else
  log_warn "HUB_INTEGRITY_SECRET is not set; replaying without an integrity token."
fi

gh "${dispatch_args[@]}" >/dev/null

log_success "Dispatch replay sent"
