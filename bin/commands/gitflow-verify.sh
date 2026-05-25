#!/usr/bin/env bash
# bin/dev gitflow:verify [repo-name] — Verify git-native SDD setup for a target repo
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SDD_ROOT="${SDD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

REPO_NAME="${1:-}"

if [[ -z "${REPO_NAME}" ]]; then
  log_error "Usage: bin/dev gitflow:verify <repo-name>"
  echo ""
  echo "  Checks that a target repo has all required git-native SDD files"
  echo "  and GitHub configuration."
  echo ""
  echo "  Example: bin/dev gitflow:verify my-api"
  exit 1
fi

cd "${SDD_ROOT}"

# Determine repo path
if [[ -d "repos/${REPO_NAME}" ]]; then
  TARGET_DIR="repos/${REPO_NAME}"
else
  log_error "Repo '${REPO_NAME}' not found at repos/${REPO_NAME}"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Git-Native SDD Verification: ${REPO_NAME}"
echo "═══════════════════════════════════════════════════════════"
echo ""

pass=0
fail=0
warn=0

check_file() {
  local path="$1"
  local desc="$2"
  local required="${3:-true}"

  if [[ -f "${TARGET_DIR}/${path}" ]]; then
    log_success "  ✓ ${path}"
    pass=$((pass + 1))
  elif [[ "${required}" == "true" ]]; then
    log_error "  ✗ ${path} — ${desc}"
    fail=$((fail + 1))
  else
    log_warn "  ⚠ ${path} — ${desc} (optional)"
    warn=$((warn + 1))
  fi
}

check_dir() {
  local path="$1"
  local desc="$2"

  if [[ -d "${TARGET_DIR}/${path}" ]]; then
    log_success "  ✓ ${path}/"
    pass=$((pass + 1))
  else
    log_error "  ✗ ${path}/ — ${desc}"
    fail=$((fail + 1))
  fi
}

log_step "Checking workflow files..."
check_file ".github/workflows/copilot-setup-steps.yml" "Copilot environment setup"
check_file ".github/workflows/plan-merged.yml" "Plan merge → execution trigger"
check_file ".github/workflows/alignment-check.yml" "Code alignment validation"
check_file ".github/workflows/sync-hub.yml" "Status sync back to hub"

echo ""
log_step "Checking Copilot configuration..."
check_file ".github/copilot-instructions.md" "Repository-wide Copilot context"
check_file ".github/instructions/sdd-planning.instructions.md" "Plan file instructions"
check_file ".github/instructions/sdd-execution.instructions.md" "Execution instructions"

echo ""
log_step "Checking agent configuration..."
check_file "AGENTS.md" "Agent rules and conventions"

echo ""
log_step "Checking plan directory..."
check_dir "sdd/plans" "Plan storage directory"

echo ""
log_step "Checking for placeholder content..."
# Check if copilot-instructions.md still has template placeholders
if [[ -f "${TARGET_DIR}/.github/copilot-instructions.md" ]]; then
  if grep -q "<Repo Name>\|<What this service\|<Key modules" "${TARGET_DIR}/.github/copilot-instructions.md" 2>/dev/null; then
    log_warn "  ⚠ copilot-instructions.md still has <placeholder> text — customize it!"
    warn=$((warn + 1))
  else
    log_success "  ✓ copilot-instructions.md appears customized"
    pass=$((pass + 1))
  fi
fi

# Check if AGENTS.md still has template placeholder
if [[ -f "${TARGET_DIR}/AGENTS.md" ]]; then
  if grep -q "<Repo Name>\|Replace.*this" "${TARGET_DIR}/AGENTS.md" 2>/dev/null; then
    log_warn "  ⚠ AGENTS.md still has placeholder text — customize it!"
    warn=$((warn + 1))
  else
    log_success "  ✓ AGENTS.md appears customized"
    pass=$((pass + 1))
  fi
fi

echo ""

# Check GitHub configuration (requires gh CLI)
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  log_step "Checking GitHub configuration (via gh CLI)..."

  # Get the GitHub repo identifier
  GIT_URL=$(awk "/^  ${REPO_NAME}:/,/^  [a-zA-Z]/" "${SDD_ROOT}/config/repos.yaml" \
    | grep "git_url:" | head -1 \
    | sed 's/.*git_url:[[:space:]]*//' | sed 's/["'\'']//g' | tr -d '[:space:]')
  GH_REPO=$(echo "${GIT_URL}" | sed 's|.*github\.com[:/]||' | sed 's|\.git$||')

  if [[ -n "${GH_REPO}" ]]; then
    # Check labels
    labels=$(gh label list --repo "${GH_REPO}" --limit 100 --json name --jq '.[].name' 2>/dev/null || echo "")
    for label in "sdd-plan" "sdd-execute" "alignment-checked"; do
      if echo "${labels}" | grep -q "^${label}$"; then
        log_success "  ✓ Label: ${label}"
        pass=$((pass + 1))
      else
        log_error "  ✗ Label: ${label} — run 'bin/dev gitflow:labels ${REPO_NAME}'"
        fail=$((fail + 1))
      fi
    done

    # Check secrets (can only verify they exist, not their values)
    secrets=$(gh secret list --repo "${GH_REPO}" --json name --jq '.[].name' 2>/dev/null || echo "")
    if echo "${secrets}" | grep -q "HUB_TOKEN"; then
      log_success "  ✓ Secret: HUB_TOKEN"
      pass=$((pass + 1))
    else
      log_error "  ✗ Secret: HUB_TOKEN not set"
      fail=$((fail + 1))
    fi

    # Check variables
    vars=$(gh variable list --repo "${GH_REPO}" --json name --jq '.[].name' 2>/dev/null || echo "")
    if echo "${vars}" | grep -q "HUB_REPO"; then
      log_success "  ✓ Variable: HUB_REPO"
      pass=$((pass + 1))
    else
      log_error "  ✗ Variable: HUB_REPO not set"
      fail=$((fail + 1))
    fi
  else
    log_warn "  ⚠ Cannot determine GitHub repo — skipping remote checks"
    warn=$((warn + 1))
  fi
else
  log_warn "  ⚠ gh CLI not available or not authenticated — skipping remote checks"
  warn=$((warn + 1))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Results: ${pass} passed, ${fail} failed, ${warn} warnings"
echo "═══════════════════════════════════════════════════════════"

if [[ ${fail} -gt 0 ]]; then
  echo ""
  log_error "Setup is incomplete. See GIT-FLOW-BOOTSTRAP.md for full instructions."
  exit 1
elif [[ ${warn} -gt 0 ]]; then
  echo ""
  log_warn "Setup looks good but has warnings. Review the items above."
  exit 0
else
  echo ""
  log_success "All checks passed! Repo is ready for git-native SDD."
  exit 0
fi
