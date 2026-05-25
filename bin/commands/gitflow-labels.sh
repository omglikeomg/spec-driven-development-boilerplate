#!/usr/bin/env bash
# bin/dev gitflow:labels <repo-name> — Create required labels for git-native SDD in a target repo
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SDD_ROOT="${SDD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

REPO_NAME="${1:-}"

if [[ -z "${REPO_NAME}" ]]; then
  log_error "Usage: bin/dev gitflow:labels <repo-name>"
  echo ""
  echo "  Creates the required GitHub labels for git-native SDD workflow."
  echo "  Uses 'gh' CLI — must be authenticated (gh auth login)."
  echo ""
  echo "  Examples:"
  echo "    bin/dev gitflow:labels my-api"
  echo "    bin/dev gitflow:labels --hub         # Create labels in the hub repo"
  exit 1
fi

require_gh_auth

cd "${SDD_ROOT}"

# Determine the GitHub repo identifier (owner/name)
if [[ "${REPO_NAME}" == "--hub" ]]; then
  # Use the current repo (hub)
  GH_REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || true)
  if [[ -z "${GH_REPO}" ]]; then
    log_error "Cannot determine hub repo. Run from within the hub git repo."
    exit 1
  fi
  log_step "Creating labels in hub repo: ${GH_REPO}"
else
  # Look up the git_url from repos.yaml to get owner/repo
  if [[ ! -f "${SDD_ROOT}/config/repos.yaml" ]]; then
    log_error "config/repos.yaml not found"
    exit 1
  fi

  # Extract git URL for this repo
  GIT_URL=$(awk "/^  ${REPO_NAME}:/,/^  [a-zA-Z]/" "${SDD_ROOT}/config/repos.yaml" \
    | grep "git_url:" | head -1 \
    | sed 's/.*git_url:[[:space:]]*//' | sed 's/["'\'']//g' | tr -d '[:space:]')

  if [[ -z "${GIT_URL}" ]]; then
    log_error "Repo '${REPO_NAME}' not found in config/repos.yaml"
    exit 1
  fi

  # Parse GitHub owner/repo from git URL
  GH_REPO=$(echo "${GIT_URL}" | sed 's|.*github\.com[:/]||' | sed 's|\.git$||')

  if [[ -z "${GH_REPO}" ]]; then
    log_error "Cannot parse GitHub repo from URL: ${GIT_URL}"
    exit 1
  fi

  log_step "Creating labels in: ${GH_REPO}"
fi

echo ""

# Define labels to create
declare -a LABEL_NAMES=("sdd-plan" "sdd-execute" "alignment-checked" "sdd-epic")
declare -a LABEL_COLORS=("0E8A16" "1D76DB" "FBCA04" "5319E7")
declare -a LABEL_DESCS=(
  "SDD planning phase — plan PR or plan issue"
  "SDD execution phase — code PR or execution issue"
  "Alignment check has been run on this PR"
  "SDD epic definition PR"
)

created=0
skipped=0

for i in "${!LABEL_NAMES[@]}"; do
  name="${LABEL_NAMES[$i]}"
  color="${LABEL_COLORS[$i]}"
  desc="${LABEL_DESCS[$i]}"

  # Check if label already exists
  if gh label list --repo "${GH_REPO}" --limit 100 2>/dev/null | grep -q "^${name}"; then
    log_info "  ⏭ ${name} (already exists)"
    skipped=$((skipped + 1))
  else
    if gh label create "${name}" --color "${color}" --description "${desc}" --repo "${GH_REPO}" 2>/dev/null; then
      log_success "  ✓ ${name}"
      created=$((created + 1))
    else
      log_error "  ✗ ${name} (failed to create)"
    fi
  fi
done

echo ""
log_success "Done: ${created} created, ${skipped} already existed"

if [[ "${REPO_NAME}" != "--hub" ]]; then
  echo ""
  log_info "Epic labels (epic-1, epic-2, ...) are created on-demand during dispatch."
  log_info "Next: Configure secrets and variables (see GIT-FLOW-BOOTSTRAP.md §2)"
fi
