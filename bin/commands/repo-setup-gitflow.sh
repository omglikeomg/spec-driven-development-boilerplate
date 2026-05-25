#!/usr/bin/env bash
# bin/dev repo:setup-gitflow <name> — Set up git-native SDD workflow in a target repo
# ─────────────────────────────────────────────────────────────────────────────
# Copies target-repo-template/ files into the specified repo and
# provides guidance on customization and GitHub configuration.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SDD_ROOT="${SDD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

REPO_NAME="${1:-}"
FORCE="${2:-}"

if [[ -z "${REPO_NAME}" ]]; then
  log_error "Usage: bin/dev repo:setup-gitflow <repo-name> [--force]"
  echo ""
  echo "  Copies git-native workflow files into the target repo."
  echo ""
  echo "  Examples:"
  echo "    bin/dev repo:setup-gitflow my-api"
  echo "    bin/dev repo:setup-gitflow my-api --force    # Overwrite existing files"
  echo ""
  echo "  Prerequisites:"
  echo "    - Repo must be registered (bin/dev repo:add)"
  echo "    - Repo submodule must be cloned (bin/dev repo:sync)"
  exit 1
fi

cd "${SDD_ROOT}"

TEMPLATE_DIR="${SDD_ROOT}/target-repo-template"
TARGET_DIR=""

# Determine where the repo lives
if [[ -d "repos/${REPO_NAME}" ]]; then
  TARGET_DIR="repos/${REPO_NAME}"
elif [[ -d "${REPO_NAME}" ]]; then
  # Allow passing a direct path
  TARGET_DIR="${REPO_NAME}"
else
  log_error "Repo '${REPO_NAME}' not found at repos/${REPO_NAME}"
  log_info "Register it first: bin/dev repo:add ${REPO_NAME} <git-url>"
  exit 1
fi

# Verify template exists
if [[ ! -d "${TEMPLATE_DIR}" ]]; then
  log_error "Template directory not found: target-repo-template/"
  log_info "This hub may be using an older version of the SDD boilerplate."
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Setting up git-native SDD workflow for: ${REPO_NAME}"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check for existing files (warn unless --force)
if [[ -d "${TARGET_DIR}/.github/workflows" ]] && [[ "${FORCE}" != "--force" ]]; then
  existing=$(find "${TARGET_DIR}/.github/workflows" -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "${existing}" -gt 0 ]]; then
    log_warn "Target repo already has ${existing} workflow file(s) in .github/workflows/"
    log_warn "Use --force to overwrite, or manually merge the templates."
    echo ""
  fi
fi

# Copy workflow files
log_step "Copying GitHub Actions workflows..."
mkdir -p "${TARGET_DIR}/.github/workflows"
for wf in "${TEMPLATE_DIR}/.github/workflows/"*.yml; do
  [[ -f "${wf}" ]] || continue
  wf_name=$(basename "${wf}")
  if [[ -f "${TARGET_DIR}/.github/workflows/${wf_name}" ]] && [[ "${FORCE}" != "--force" ]]; then
    log_warn "  Skipping ${wf_name} (exists — use --force to overwrite)"
  else
    cp "${wf}" "${TARGET_DIR}/.github/workflows/${wf_name}"
    log_info "  ✓ .github/workflows/${wf_name}"
  fi
done

# Copy copilot-instructions.md
log_step "Copying Copilot instructions..."
if [[ -f "${TARGET_DIR}/.github/copilot-instructions.md" ]] && [[ "${FORCE}" != "--force" ]]; then
  log_warn "  Skipping copilot-instructions.md (exists)"
else
  cp "${TEMPLATE_DIR}/.github/copilot-instructions.md" "${TARGET_DIR}/.github/copilot-instructions.md"
  log_info "  ✓ .github/copilot-instructions.md"
fi

# Copy path-specific instructions
log_step "Copying path-specific instructions..."
mkdir -p "${TARGET_DIR}/.github/instructions"
for inst in "${TEMPLATE_DIR}/.github/instructions/"*.md; do
  [[ -f "${inst}" ]] || continue
  inst_name=$(basename "${inst}")
  if [[ -f "${TARGET_DIR}/.github/instructions/${inst_name}" ]] && [[ "${FORCE}" != "--force" ]]; then
    log_warn "  Skipping ${inst_name} (exists)"
  else
    cp "${inst}" "${TARGET_DIR}/.github/instructions/${inst_name}"
    log_info "  ✓ .github/instructions/${inst_name}"
  fi
done

# Copy AGENTS.md
log_step "Copying AGENTS.md..."
if [[ -f "${TARGET_DIR}/AGENTS.md" ]] && [[ "${FORCE}" != "--force" ]]; then
  log_warn "  Skipping AGENTS.md (exists — consider merging git-native sections manually)"
else
  cp "${TEMPLATE_DIR}/AGENTS.md" "${TARGET_DIR}/AGENTS.md"
  log_info "  ✓ AGENTS.md"
fi

# Create sdd/plans/ directory
log_step "Creating sdd/plans/ directory..."
mkdir -p "${TARGET_DIR}/sdd/plans"
if [[ ! -f "${TARGET_DIR}/sdd/plans/.gitkeep" ]]; then
  touch "${TARGET_DIR}/sdd/plans/.gitkeep"
  log_info "  ✓ sdd/plans/.gitkeep"
else
  log_info "  ✓ sdd/plans/ already exists"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
log_success "Files copied successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "⚠  REQUIRED: Customize these files for your repo:"
echo ""
echo "  1. ${TARGET_DIR}/.github/workflows/copilot-setup-steps.yml"
echo "     → Match your tech stack (Node version, package manager, etc.)"
echo ""
echo "  2. ${TARGET_DIR}/.github/copilot-instructions.md"
echo "     → Replace ALL <placeholders> with actual repo details"
echo ""
echo "  3. ${TARGET_DIR}/AGENTS.md"
echo "     → Update build commands and repo-specific rules"
echo ""
echo "  4. ${TARGET_DIR}/.github/instructions/sdd-execution.instructions.md"
echo "     → Update 'applyTo' if source lives outside src/**,lib/**,test/**"
echo ""
echo "⚠  REQUIRED: Configure GitHub (see GIT-FLOW-BOOTSTRAP.md):"
echo ""
echo "  • Secret: HUB_TOKEN (token with write access to hub repo)"
echo "  • Variable: HUB_REPO (e.g., 'org/my-domain-hub')"
echo "  • Labels: sdd-plan, sdd-execute, alignment-checked"
echo "  • Branch protection on main"
echo "  • Enable Copilot Cloud Agent"
echo ""
echo "  Quick label setup:"
echo "    bin/dev gitflow:labels ${REPO_NAME}"
echo ""
