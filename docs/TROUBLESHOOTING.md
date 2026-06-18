# Troubleshooting Guide — SDD Automation

## Quick Reference

| Symptom | Likely cause | Run this first |
|---------|-------------|---------------|
| Workflow didn't fire | Branch name mismatch | `bin/dev wf:validate` |
| Dispatch event not received | Missing reusable workflow in target repo | `bin/dev install-workflows <repo> --dry-run` |
| Jira ticket not created | Missing Jira secrets | `node bin/sync-state.js preflight` |
| AI verification skipped | GitHub Models API unavailable | Check workflow run logs for `api_error` |
| Status not updating in hub | Invalid state transition | `node bin/sync-state.js validate-status <layer> <current> <new>` |
| Cross-reference warning on PR | Missing link in PR description | Add `**Target repo PR:**` or `**Hub plan PR:**` |
| Branch naming advisory | Branch doesn't match pattern | See `config/teams.yaml → branching.branch_format` |

---

## Error Codes

All automation errors use structured codes. Find your error below.

### CONFIG errors (SDD-001, SDD-013, SDD-015)

**SDD-001 — Configuration missing**
```
Category: CONFIG | Severity: HIGH
```
One of `config/repos.yaml`, `config/teams.yaml`, or `config/commands.yaml` is missing required fields.

1. Run `bin/dev wf:validate` to check config validity
2. Ensure `config/teams.yaml` has: `active_team`, `jira.project_key`, `branching.base_branch`
3. Ensure `config/repos.yaml` has at least one repo with `has_own_sdd` and `git_url`

**SDD-013 — Branch naming mismatch**
```
Category: CONFIG | Severity: MEDIUM
```
The PR branch doesn't match the expected pattern from `config/teams.yaml`.

1. Check the branch against the expected format: `<type>/<TICKET-ID>_<description>`
2. Example: `feat/PROJ-123_add-endpoint`
3. This is advisory — it won't block the PR

**SDD-015 — Required secret or variable missing**
```
Category: CONFIG | Severity: HIGH
```
A required repository secret or variable is not configured.

1. Go to repo Settings → Secrets and variables → Actions
2. Required: `HUB_CROSS_REPO_TOKEN` (PAT with repo+workflow scopes)
3. Required variables: `HUB_REPO` (org/repo-name format)
4. Optional (for Jira): `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_USER_EMAIL`
5. Optional (for integrity): `HUB_INTEGRITY_SECRET`

### EPIC errors (SDD-002, SDD-003)

**SDD-002 — Epic not found**
```
Category: EPIC | Severity: HIGH
```
The epic directory could not be resolved from the branch name.

1. The branch must match `epic/<TICKET-ID>_<name>` where `<TICKET-ID>` is the epic's `id` field in `epic.md`
2. Verify the epic directory exists under `epics/`
3. Check that `epic.md` has a matching `id` in its frontmatter

**SDD-003 — Task not found**
```
Category: EPIC | Severity: MEDIUM
```
The task ID from the branch doesn't match any task in `task-graph.md`.

1. Verify the task ID exists in `epics/<epic>/task-graph.md` frontmatter
2. Task IDs are integers matching delivery.yaml nodes

### STATE errors (SDD-004, SDD-005, SDD-011, SDD-012, SDD-014, SDD-016)

**SDD-004 — Invalid status transition**
```
Category: STATE | Severity: MEDIUM
```
Attempting to transition a task/node to a status that's not allowed from its current state.

1. Check `user-development/STATUS-REFERENCE.md` for valid transitions
2. Test: `node bin/sync-state.js validate-status task in-progress done`
3. The hub's `target-status-events.yml` validates transitions before applying them

**SDD-005 — Plan manifest not found**
```
Category: STATE | Severity: MEDIUM
```
The manifest.yaml for the plan could not be found.

1. Manifest should be at `agent-development/plans/<task>/manifest.yaml`
2. OR `fallback-sdd/<repo>/agent-development/plans/<task>/manifest.yaml`
3. Ensure `task_id` and `epic_id` fields are set in the manifest

**SDD-011 / SDD-012 — Cross-reference missing**
```
Category: STATE | Severity: LOW
```
SDD-011: Hub plan PR is missing `**Target repo PR:**` link.
SDD-012: Execution PR is missing `**Hub plan PR:**` link.

1. Add the missing link to the PR description
2. These are advisory — they don't block merges

**SDD-014 — Blast radius exceeded**
```
Category: STATE | Severity: LOW
```
Files changed in the PR are outside the plan's declared scope (`manifest.yaml` context_files + output_files).

1. Check which files the plan says should be changed
2. Expand the plan scope or revert unintended changes
3. Advisory only

**SDD-016 — SDD context file missing**
```
Category: STATE | Severity: LOW
```
The `.sdd/context.yaml` file wasn't found in the target repo.

1. This file is auto-created by `receive-task.yml` during task dispatch
2. If missing, add `Epic ID:` and `Task ID:` to the PR body manually

### INTEGRATION errors (SDD-006, SDD-007, SDD-008, SDD-009, SDD-010)

**SDD-006 — Jira API failure**
```
Category: INTEGRATION | Severity: HIGH | Retryable: Yes
```
1. Verify `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` secrets
2. Check Jira API is reachable: `curl -I $JIRA_BASE_URL/rest/api/3/myself`
3. Check for rate limiting
4. Automation will continue — Jira integration failures are non-blocking

**SDD-007 — GitHub API failure**
```
Category: INTEGRATION | Severity: MEDIUM | Retryable: Yes
```
1. Check `https://api.github.com/rate_limit` using the HUB_CROSS_REPO_TOKEN
2. Verify the token has `repo` and `workflow` scopes
3. Check token hasn't expired

**SDD-008 — AI verification API unavailable**
```
Category: INTEGRATION | Severity: LOW | Retryable: Yes
```
1. Check GitHub Models availability: `https://models.github.ai`
2. This is non-blocking — PRs proceed without verification
3. The workflow retries 3 times with backoff before skipping

**SDD-009 — Repository dispatch failed**
```
Category: INTEGRATION | Severity: MEDIUM | Retryable: Yes
```
1. Verify the target repo has the reusable workflow on its default branch
2. Run `bin/dev install-workflows <repo> --dry-run` to check
3. The HUB_CROSS_REPO_TOKEN needs `repo` and `workflow` scopes

**SDD-010 — Event integrity check failed**
```
Category: INTEGRATION | Severity: HIGH | Retryable: No
```
The integrity token in a `repository_dispatch` event didn't match the expected value.

1. This may indicate a forged or replayed event
2. Verify `HUB_INTEGRITY_SECRET` is set to the same value in both hub and target repos
3. Investigate the event source if this occurs without configuration changes

### SYSTEM errors (SDD-017, SDD-018)

**SDD-017 — File mutation failed**
```
Category: SYSTEM | Severity: MEDIUM | Retryable: Yes
```
A file write operation failed but a backup may be available.

1. Look for `.bak` files alongside the target file (e.g., `task-graph.md.bak.1717539200000`)
2. Restore from backup: `cp task-graph.md.bak.XXXX task-graph.md`
3. Re-run the operation

**SDD-018 — Unexpected error**
```
Category: SYSTEM | Severity: HIGH | Retryable: Yes
```
1. Find the correlation ID in workflow run logs
2. Check audit trail: `node bin/sync-state.js audit-summary <date>`
3. Query by correlation: grep for the ID in `.sdd-audit/sdd-audit-<date>.jsonl`
4. Re-run the workflow if retryable

---

## Debugging Dispatch Chains

When a dispatched event doesn't trigger the expected workflow in the target repo:

```
plan-execution-trigger → repository_dispatch(task-assigned) → receive-task.yml (target repo)
```

1. **Check the hub workflow run** — did it complete successfully?
2. **Check GitHub's dispatch log** — Settings → Webhooks → Recent Deliveries in the target repo
3. **Verify the reusable workflow exists** — target repo must have the workflow on its default branch
4. **Check the token** — `HUB_CROSS_REPO_TOKEN` must be a PAT or GitHub App token with `repo` + `workflow` scopes
5. **Verify event type** — the workflow in the target repo must listen for the exact event_type (`task-assigned`, `verify-pr`, `pr-status-change`)

## Resetting Stuck States

If a task or delivery node is in an incorrect state:

```bash
# Check current state
node bin/sync-state.js dump <epic-id>

# Validate transition before applying
node bin/sync-state.js validate-status task in-progress done

# Force update (with backup)
node bin/sync-state.js update-task <epic-id> <task-id> done --backup

# Force delivery node update
node bin/sync-state.js update-pr <epic-id> <task-id> merged --backup --pr-url="https://github.com/org/repo/pull/123"
```

## Audit Trail

Every automation action is logged to `.sdd-audit/sdd-audit-YYYY-MM-DD.jsonl`.

```bash
# View today's audit
node bin/sync-state.js audit-summary

# Query by correlation ID
grep "correlation_id.*abc123" .sdd-audit/sdd-audit-*.jsonl

# Query by epic
node -e "
  const { queryByEpic } = require('./bin/sync-state/audit');
  console.log(JSON.stringify(queryByEpic('1', '2026-06-04'), null, 2));
"
```

## Restoring from Backup

The sync-state engine creates `.bak` files before all mutations:

```bash
# Find backups
ls -la epics/*/task-graph.md.bak.*
ls -la epics/*/delivery.yaml.bak.*

# Restore a specific backup
cp epics/1-my-epic/task-graph.md.bak.1717539200000 epics/1-my-epic/task-graph.md

# Clean old backups (>7 days)
node -e "const { cleanupBackups } = require('./bin/sync-state/_common'); cleanupBackups('epics');"
```

## Common Workflow Failure Scenarios

### "GitHub Actions is not enabled for this repo"
1. Go to repo Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. For reusable workflows from private repos, enable access to the hub repo

### "Workflow does not exist on this reference"
1. The reusable workflow must be on the default branch of the hub repo
2. Merge the workflow files to `main` before they can be called by `@main`

### "Personal access token lacks required scopes"
1. HUB_CROSS_REPO_TOKEN needs: `repo` (full), `workflow` (read/write)
2. If using fine-grained PAT: enable `Contents: Read and write`, `Pull requests: Read and write`, `Workflows: Read and write`
3. The token must have access to both the hub repo and all target repos

## Getting Help

1. Run `bin/dev wf:status` for workflow state overview
2. Run `bin/dev wf:validate` for config validation
3. Check workflow run logs for correlation IDs and error codes
4. See `common-specs/git-workflow.md` for automation architecture
5. Report issues with correlation IDs for faster triage
