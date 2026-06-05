---
name: sdd-execute-plan
description: Execute an approved SDD plan. Use when the user wants to implement code from an approved plan folder. Executes stages in order, commits progressively, and marks the PR as ready for review.
---

# Execute an Approved SDD Plan

You are implementing code from an approved plan. You execute stages in order, commit progressively, and mark the PR ready for review when all stages are complete.

---

## Identify the Plan

If the user specified which plan to execute, use that folder. If not, check `agent-development/plans/` and `epics/active/*/plans/` for approved plans (where `manifest.yaml` has `approval.status: approved`) and ask the user which one to execute.

---

## Context to Read (Before Executing)

Before writing any code, silently read:

1. **Agent specs** — all files in `agent-development/agent-specs/`
2. **Team config** — `config/teams.yaml` (branching conventions, co-author)
3. **The plan** — `manifest.yaml` and `specification.md` in the plan folder
4. **Status reference** — `user-development/STATUS-REFERENCE.md`
5. **If part of an epic:** the `delivery.yaml` in the epic folder

---

## Pre-Flight Checks

Before writing any code, verify ALL of the following:

1. `manifest.yaml` → `plan_metadata.approval.status == "approved"`
2. No `PENDING` markers remain in `specification.md`
3. You are on the correct feature branch (created during planning)
4. A draft PR already exists for this branch (created during planning)
5. If no branch/PR exists (legacy flow): create the branch from the base branch in `config/teams.yaml` and open a draft PR:
   ```bash
   gh pr create --draft --title "<type>: <ticket-id> <short-description>" --body "Implementation of approved plan. See specification.md."
   ```

If pre-flight checks fail, STOP and inform the user what's wrong.

---

## Execution Protocol

For each stage (in order):

### 1. Read the Stage Instruction File

Read the full stage file specified in `manifest.yaml` → `stages[].instruction_file`.

### 2. Present the Commit Plan

Show the user the table of planned commits before writing any code. Format:

| # | Commit Message | Files | Purpose |
|---|---|---|---|
| 1 | `feat(scope): description` | `file1.ts`, `file2.ts` | What this commit accomplishes |

### 3. Wait for User Approval

Do NOT proceed until the user explicitly approves the commit plan. They may request changes.

### 4. Execute Commit Units (One at a Time)

For each commit unit in the approved plan:

1. Implement the change
2. Run verification commands (lint, typecheck, tests as appropriate for the stage)
3. **If pass** → commit with conventional commit message + co-author trailer from `config/teams.yaml`
4. **If fail** → attempt to fix (max 2 retries). If still failing, STOP and report the failure.

### 5. API Checkpoint (if `api_checkpoint: true` for this stage)

- Provide the curl/GraphQL command from the stage instructions
- **STOP and wait for the user's confirmation** that the API behaves correctly before proceeding

### 6. After All Commits in Stage Pass

- Update `manifest.yaml`: set this stage's status to `done`, increment `current_stage`
- Push to the branch — the draft PR updates automatically

---

## After ALL Stages Complete

1. Run full verification (build + test + lint + typecheck)
2. Mark PR as **ready for review** (remove draft status):
   ```bash
   gh pr ready
   ```
3. Update `manifest.yaml`: set `plan_metadata.status: done`
4. **For standalone tasks:**
   - Archive plan folder to `agent-development/done/plans/`
   - Archive request file to `agent-development/done/requests/`
   - Final commit: `chore: <ticket-id> archive completed plan and request`
5. **For epic tasks:**
   - Plans stay in the epic folder
   - Update `delivery.yaml` node status to `ready-for-review`
   - Update `task-graph.md` task status to `done`

---

## Rules

- Do NOT write code before the user approves the commit plan
- Do NOT skip verification steps
- Do NOT modify files outside the stage's `blast_radius.write`
- Do NOT force-push to the branch
- Do NOT merge the PR — humans merge manually
- Multiple commits per stage are expected and encouraged
- If you discover something unexpected, classify it and handle per the Discovery Handling section below

---

## Discovery Handling

If you encounter something unexpected during execution:

| Severity | Action |
|---|---|
| `info` | Log in `manifest.yaml` amendments section, continue executing |
| `question` | Log in `manifest.yaml`, use a safe default, flag for async review |
| `blocker` | Log in `manifest.yaml`, set plan status to `paused`, STOP and wait for user |

For blockers: the user will edit the manifest with their decision, then tell you to resume.
