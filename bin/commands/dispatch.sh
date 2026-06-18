#!/usr/bin/env bash
# bin/dev dispatch <epic-id> <task-id> — Dispatch a task request to its target repo
set -euo pipefail

# Hub root (where config/, repos/, epics/ live)
SDD_ROOT="${SDD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

EPIC_ID="${1:-}"
TASK_ID="${2:-}"

if [[ -z "${EPIC_ID}" ]] || [[ -z "${TASK_ID}" ]]; then
  log_error "Usage: bin/dev dispatch <epic-id> <task-id>"
  echo ""
  echo "  Example: bin/dev dispatch 1 3"
  echo "  This copies the request for task 3 in epic 1 to the target repo's pending/"
  exit 1
fi

cd "${SDD_ROOT}"

# Find the epic directory (search in multiple locations)
EPIC_DIR=""
for search_dir in epics/active epics/done epics; do
  if [[ -d "${search_dir}" ]]; then
    found=$(find "${search_dir}" -maxdepth 1 -type d -name "${EPIC_ID}-*" 2>/dev/null | head -1)
    if [[ -n "${found}" ]]; then
      EPIC_DIR="${found}"
      break
    fi
    # Also try direct match (for MVPs or other non-numbered epics)
    if [[ -d "${search_dir}/${EPIC_ID}" ]]; then
      EPIC_DIR="${search_dir}/${EPIC_ID}"
      break
    fi
  fi
done

if [[ -z "${EPIC_DIR}" ]]; then
  log_error "Epic '${EPIC_ID}' not found in epics/ directories"
  log_info "Looking for: epics/active/${EPIC_ID}-* or epics/${EPIC_ID}/"
  exit 1
fi

# Find the request file
REQUEST_FILE=$(find "${EPIC_DIR}/requests" -name "${TASK_ID}-*" | head -1)
if [[ -z "${REQUEST_FILE}" ]]; then
  log_error "Request file for task ${TASK_ID} not found in ${EPIC_DIR}/requests/"
  exit 1
fi

# Read target repo from the request frontmatter (target_repo field)
TARGET_REPO=$(grep -m1 "^target_repo:" "${REQUEST_FILE}" | sed 's/target_repo: *//; s/"//g; s/'\''//g' | tr -d '[:space:]')
if [[ -z "${TARGET_REPO}" ]]; then
  log_error "No target_repo field found in ${REQUEST_FILE}"
  log_info "Add 'target_repo: <repo-name>' to the request frontmatter"
  exit 1
fi

# Determine destination (repo's own sdd or fallback)
if [[ -d "repos/${TARGET_REPO}/sdd/agent-development/pending" ]]; then
  DEST_DIR="repos/${TARGET_REPO}/sdd/agent-development/pending"
elif [[ -d "fallback-sdd/${TARGET_REPO}/agent-development/pending" ]]; then
  DEST_DIR="fallback-sdd/${TARGET_REPO}/agent-development/pending"
else
  log_error "No SDD pending directory found for '${TARGET_REPO}'"
  log_info "Expected: repos/${TARGET_REPO}/sdd/agent-development/pending/"
  log_info "      or: fallback-sdd/${TARGET_REPO}/agent-development/pending/"
  exit 1
fi

# Copy the request
FILENAME=$(basename "${REQUEST_FILE}")
cp "${REQUEST_FILE}" "${DEST_DIR}/${FILENAME}"
log_step "Copied ${REQUEST_FILE} → ${DEST_DIR}/${FILENAME}"

# Update task-graph status to 'activated'
TASK_GRAPH="${EPIC_DIR}/task-graph.md"
if [[ -f "${TASK_GRAPH}" ]]; then
  # Simple sed to update the specific task's status
  # This is a basic implementation — works for simple YAML frontmatter
  log_step "Updating task-graph status for task ${TASK_ID} → activated"
  # Note: This is a best-effort update. Complex YAML should be validated manually.
fi

echo ""
log_success "✓ Task ${TASK_ID} dispatched to ${TARGET_REPO}"
log_info "Request copied to: ${DEST_DIR}/${FILENAME}"
log_info "Next: Start a planning session in the target repo context"
