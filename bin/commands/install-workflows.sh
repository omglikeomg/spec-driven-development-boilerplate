#!/usr/bin/env bash
# bin/dev install-workflows <repo-name> [--commit]
# Installs SDD reusable workflow callers in a target repo.
# Copies minimal caller workflows from .github/workflow-templates/ to
# the target repo's .github/workflows/ directory.
set -euo pipefail

REPO_NAME=""
AUTO_COMMIT=false
DRY_RUN=false

for arg in "$@"; do
  case "${arg}" in
    --commit) AUTO_COMMIT=true ;;
    --dry-run) DRY_RUN=true ;;
    -*) log_error "Unknown option: ${arg}"; exit 1 ;;
    *) REPO_NAME="${arg}" ;;
  esac
done

if [[ -z "${REPO_NAME}" ]]; then
  log_error "Usage: bin/dev install-workflows <repo-name> [--commit] [--dry-run]"
  echo ""
  echo "  Installs minimal SDD workflow callers in a target repo so it can"
  echo "  participate in the hub's automation."
  echo ""
  echo "  Arguments:"
  echo "    <repo-name>  Key from config/repos.yaml (e.g., 'example-api')"
  echo "    --commit     Automatically commit and open a PR in the target repo"
  echo "    --dry-run    Show what would be copied without making changes"
  echo ""
  echo "  Prerequisites for the target repo:"
  echo "    1. Set HUB_REPO variable (org/hub-repo-name)"
  echo "    2. Create HUB_CROSS_REPO_TOKEN secret (PAT with repo+workflow scopes)"
  echo ""

  if [[ -f "config/repos.yaml" ]]; then
    echo -e "  ${_BOLD}Available repos:${_RESET}"
    grep -E '^  [a-z]' config/repos.yaml | sed 's/:.*//;s/^  /    /'
  fi
  exit 1
fi

GIT_URL=$(node -e "
  const fs = require('fs');
  const text = fs.readFileSync('config/repos.yaml', 'utf8');
  const match = text.match(new RegExp('^  ${REPO_NAME}:[\\\\s\\\\S]*?git_url:\\\\s*\\\"([^\\\"]+)\\\"', 'm'));
  process.stdout.write(match ? match[1] : '');
")

if [[ -z "${GIT_URL}" ]]; then
  log_error "Repo '${REPO_NAME}' not found in config/repos.yaml"
  exit 1
fi

SUB_PATH=$(node -e "
  const fs = require('fs');
  const text = fs.readFileSync('config/repos.yaml', 'utf8');
  const match = text.match(new RegExp('^  ${REPO_NAME}:[\\\\s\\\\S]*?submodule_path:\\\\s*\\\"([^\\\"]+)\\\"', 'm'));
  process.stdout.write(match ? match[1] : 'repos/${REPO_NAME}');
")

REPO_PATH="${SUB_PATH}"
if [[ ! -d "${REPO_PATH}" ]]; then
  log_warn "Repo checkout not found at ${REPO_PATH}"
  log_info "Cloning from ${GIT_URL}..."
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Would clone ${GIT_URL} to ${REPO_PATH}"
  else
    git clone "${GIT_URL}" "${REPO_PATH}" --depth 1
  fi
fi

log_step "Installing workflows in ${REPO_NAME}"

TEMPLATE_DIR=".github/workflow-templates"
TARGET_WF_DIR="${REPO_PATH}/.github/workflows"

FILES_TO_INSTALL=("receive-task.yml" "notify-hub-verification.yml")

if [[ "${DRY_RUN}" == "true" ]]; then
  echo ""
  log_step "DRY RUN — would copy:"
  for f in "${FILES_TO_INSTALL[@]}"; do
    echo "  ${TEMPLATE_DIR}/${f} → ${TARGET_WF_DIR}/${f}"
  done
  echo ""
  log_info "No changes made."
  exit 0
fi

mkdir -p "${TARGET_WF_DIR}"

for f in "${FILES_TO_INSTALL[@]}"; do
  src="${TEMPLATE_DIR}/${f}"
  dest="${TARGET_WF_DIR}/${f}"
  if [[ ! -f "${src}" ]]; then
    log_warn "Template not found: ${src}"
    continue
  fi
  cp "${src}" "${dest}"
  log_success "Copied ${f}"
done

log_info ""
log_info "Workflow files installed in ${REPO_PATH}/.github/workflows/"
log_info ""

log_info "Next steps for the target repo owner:"
log_info "  1. Set repository variable: HUB_REPO = <org>/<hub-repo-name>"
log_info "  2. Set repository secret: HUB_CROSS_REPO_TOKEN (PAT with repo+workflow scopes)"
log_info "  3. Commit and merge the workflow files into the default branch"
echo ""

if [[ "${AUTO_COMMIT}" == "true" ]]; then
  OLD_DIR="$(pwd)"
  cd "${REPO_PATH}"
  if [[ -d ".git" ]]; then
    if git diff --quiet && git diff --cached --quiet; then
      log_info "No changes to commit in ${REPO_NAME}"
    else
      git add .github/workflows/receive-task.yml .github/workflows/notify-hub-verification.yml
      git commit -m "chore(ci): install SDD hub automation workflows"
      log_success "Committed workflow files in ${REPO_NAME}"
      echo ""
      log_info "To create a PR:"
      log_info "  cd ${REPO_PATH} && git push origin HEAD && gh pr create --title 'chore(ci): install SDD hub automation' --body 'Installs hub automation workflows.' --base main"
    fi
  else
    log_warn "${REPO_PATH} is not a git repo. Cannot auto-commit."
  fi
  cd "${OLD_DIR}"
else
  log_info "Run with --commit to auto-commit and prepare the PR."
fi
