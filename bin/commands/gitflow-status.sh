#!/usr/bin/env bash
# bin/dev gitflow:status [repo-name] — Show git-native pipeline status via GitHub API
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SDD_ROOT="${SDD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

REPO_NAME="${1:-}"

require_gh_auth

cd "${SDD_ROOT}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  GIT-NATIVE SDD PIPELINE STATUS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# If a specific repo is given, show its status
if [[ -n "${REPO_NAME}" ]]; then
  # Look up the git_url from repos.yaml
  GIT_URL=$(awk "/^  ${REPO_NAME}:/,/^  [a-zA-Z]/" "${SDD_ROOT}/config/repos.yaml" \
    | grep "git_url:" | head -1 \
    | sed 's/.*git_url:[[:space:]]*//' | sed 's/["'\'']//g' | tr -d '[:space:]')

  if [[ -z "${GIT_URL}" ]]; then
    log_error "Repo '${REPO_NAME}' not found in config/repos.yaml"
    exit 1
  fi

  GH_REPO=$(echo "${GIT_URL}" | sed 's|.*github\.com[:/]||' | sed 's|\.git$||')
  log_step "Status for: ${GH_REPO}"
  echo ""

  # Plan issues (open)
  log_info "📋 Plan Issues (sdd-plan):"
  plan_issues=$(gh issue list --repo "${GH_REPO}" --label "sdd-plan" --state open --json number,title,assignees --jq '.[] | "  #\(.number) \(.title) [\(.assignees | map(.login) | join(", "))]"' 2>/dev/null || echo "  (unable to fetch)")
  if [[ -z "${plan_issues}" ]]; then
    echo "  (none)"
  else
    echo "${plan_issues}"
  fi
  echo ""

  # Execution issues (open)
  log_info "🔨 Execution Issues (sdd-execute):"
  exec_issues=$(gh issue list --repo "${GH_REPO}" --label "sdd-execute" --state open --json number,title,assignees --jq '.[] | "  #\(.number) \(.title) [\(.assignees | map(.login) | join(", "))]"' 2>/dev/null || echo "  (unable to fetch)")
  if [[ -z "${exec_issues}" ]]; then
    echo "  (none)"
  else
    echo "${exec_issues}"
  fi
  echo ""

  # Open PRs with SDD labels
  log_info "🔀 Open PRs (sdd-plan or sdd-execute):"
  prs=$(gh pr list --repo "${GH_REPO}" --label "sdd-plan,sdd-execute" --json number,title,isDraft,labels --jq '.[] | "  #\(.number) \(if .isDraft then "[DRAFT]" else "[READY]" end) \(.title)"' 2>/dev/null || echo "  (unable to fetch)")
  if [[ -z "${prs}" ]]; then
    echo "  (none)"
  else
    echo "${prs}"
  fi
  echo ""

  # Recent workflow runs
  log_info "⚙️  Recent Workflow Runs:"
  runs=$(gh run list --repo "${GH_REPO}" --limit 5 --json name,status,conclusion,createdAt --jq '.[] | "  \(.status)/\(.conclusion // "—") \(.name) (\(.createdAt | split("T")[0]))"' 2>/dev/null || echo "  (unable to fetch)")
  if [[ -z "${runs}" ]]; then
    echo "  (none)"
  else
    echo "${runs}"
  fi

else
  # No repo specified — show overview across all repos
  log_step "Scanning all registered repos..."
  echo ""

  if [[ ! -f "${SDD_ROOT}/config/repos.yaml" ]]; then
    log_error "config/repos.yaml not found"
    exit 1
  fi

  # Get list of repos
  repos=$(awk '/^repositories:/{found=1; next} /^[a-z]/{found=0} found && /^  [a-zA-Z]/' "${SDD_ROOT}/config/repos.yaml" \
    | grep -v "^  #" | sed 's/://g' | awk '{print $1}' | head -20)

  printf "%-20s %-6s %-6s %-6s %s\n" "REPO" "PLAN" "EXEC" "PRs" "STATUS"
  printf "%-20s %-6s %-6s %-6s %s\n" "────" "────" "────" "───" "──────"

  while IFS= read -r repo_key; do
    [[ -z "${repo_key}" ]] && continue

    GIT_URL=$(awk "/^  ${repo_key}:/,/^  [a-zA-Z]/" "${SDD_ROOT}/config/repos.yaml" \
      | grep "git_url:" | head -1 \
      | sed 's/.*git_url:[[:space:]]*//' | sed 's/["'\'']//g' | tr -d '[:space:]')

    GH_REPO=$(echo "${GIT_URL}" | sed 's|.*github\.com[:/]||' | sed 's|\.git$||')

    if [[ -z "${GH_REPO}" ]]; then
      printf "%-20s %-6s %-6s %-6s %s\n" "${repo_key}" "?" "?" "?" "cannot parse URL"
      continue
    fi

    # Count open plan issues
    plan_count=$(gh issue list --repo "${GH_REPO}" --label "sdd-plan" --state open --json number --jq 'length' 2>/dev/null || echo "?")
    # Count open exec issues
    exec_count=$(gh issue list --repo "${GH_REPO}" --label "sdd-execute" --state open --json number --jq 'length' 2>/dev/null || echo "?")
    # Count open PRs
    pr_count=$(gh pr list --repo "${GH_REPO}" --json number --jq 'length' 2>/dev/null || echo "?")

    # Determine status
    status="idle"
    if [[ "${exec_count}" != "0" ]] && [[ "${exec_count}" != "?" ]]; then
      status="executing"
    elif [[ "${plan_count}" != "0" ]] && [[ "${plan_count}" != "?" ]]; then
      status="planning"
    fi

    printf "%-20s %-6s %-6s %-6s %s\n" "${repo_key}" "${plan_count}" "${exec_count}" "${pr_count}" "${status}"
  done <<< "${repos}"

  echo ""
  log_info "Use 'bin/dev gitflow:status <repo-name>' for detailed view"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
