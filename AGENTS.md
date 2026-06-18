# Multirepo Hub — Rules for AI Coding Agents

> **This is a multirepo coordination hub.** It manages cross-repo epics
> for a specific domain/project. It does NOT contain application code itself.
>
> **Replace this intro** with your domain name after scaffolding
> (e.g., "Manages cross-repo epics for the Marketplace platform").

---

## How This Hub Works

This repo coordinates planning and execution across multiple service repositories.
Each managed repo is a git submodule under `repos/`.

| Directory | Purpose |
|-----------|---------|
| `config/` | Registry (`repos.yaml`) and team settings (`teams.yaml`) |
| `epics/` | Cross-repo epic planning (epic.md, task-graph.md, delivery.yaml) |
| `repos/` | Git submodules — one per managed repo (agent-managed only) |
| `fallback-sdd/` | SDD structures for repos that lack their own `sdd/` |
| `common-specs/` | Universal conventions (git workflow, PR rules, SDD process) |
| `documentation/` | Per-repo architecture docs (fallback when repo lacks its own) |
| `contracts/` | Cross-service interface specs (API schemas, event definitions) |
| `architectural-schemas/` | System-level topology diagrams |
| `bin/` | Hub CLI commands (coordination, not build/test) |
| `bin/workflow-scripts/` | Extracted GitHub Actions logic and shared workflow helpers |

---

## Your Two Modes of Operation

| Mode | When | What you do |
|------|------|-------------|
| **Coordination** | Planning epics, dispatching tasks, updating status | Work at hub root. Read/write `epics/`, `config/`, delivery manifests. |
| **Execution** | Implementing a task in a specific repo | Work inside `repos/<name>/`. Read that repo's `sdd/` (or `fallback-sdd/<name>/`). Make code changes. |

---

## Context Resolution (What to Read)

When executing a task in `<repo>`, read specs in this priority order:

| Priority | Source | Path |
|----------|--------|------|
| 1 | Task plan | The plan's `manifest.yaml` + stage files (blast radius, instructions) |
| 2 | Repo-level specs | `repos/<repo>/sdd/agent-development/agent-specs/` OR `fallback-sdd/<repo>/agent-development/agent-specs/` |
| 3 | Hub documentation | `documentation/<repo>/` + `contracts/<repo>/` + `architectural-schemas/` |
| 4 | Common specs | `common-specs/git-workflow.md`, `common-specs/pr-conventions.md`, `common-specs/sdd-process.md`, `common-specs/writing-specs.md` |

**Rule:** If a spec exists at the repo level, it takes precedence over the hub's common/fallback version.

---

## The Sync Rule

After completing execution of a task, before ending your session:

1. **Update plan status** — set `manifest.yaml` → `status: done` on the hub plan branch
2. **Update hub task-graph** — set the task's status to `done` in `epics/<epic>/task-graph.md` on the hub plan branch
3. **Update hub delivery manifest** — add the target repo's PR URL and branch name to `epics/<epic>/delivery.yaml` on the hub plan branch
4. **Mark hub plan PR ready for review** — the plan branch PR moves from draft to ready once the target repo PR exists and the plan is complete

This keeps both the local and coordination-level state in sync.

---

## Hub Branch Model

The hub uses **two distinct branch types**. Each has a different lifecycle.

### Epic branches — `epic/<ticket-id>_<description>`

Define the epic. Short-lived. Merged to `main` once all requests are refined and the task graph is approved — **before** execution begins.

```
epic/PROJ-55110_epic-name
  └── epics/<epic>/epic.md
  └── epics/<epic>/task-graph.md
  └── epics/<epic>/delivery.yaml
```

Lifecycle: `draft PR → human refines requests → approved → merge to main`

### Plan branches — `plan/<ticket-id>_<description>`

One per task. Contain the plan files, SDD state updates, and documentation changes for that specific task. Created when the agent begins planning; merged to `main` after the task is fully executed and the target repo PR is merged.

```
plan/PROJ-123_task-name
  └── fallback-sdd/<repo>/agent-development/plans/<task>/   ← plan files (status: done after execution)
  └── epics/<epic>/task-graph.md                            ← status updated
  └── epics/<epic>/delivery.yaml                            ← PR URL recorded
  └── documentation/<repo>/XX-affected-doc.md               ← if fallback SDD
```

Lifecycle: `draft PR (plan under review) → approved → target repo PR created → execution → sync → ready for review → merge to main`

### Target repo branches — `<type>/<ticket-id>_<description>`

One per task. Contain only code changes. Linked to the hub plan PR via description.

Lifecycle: `draft PR → implementation done → ready for code review → merge to <default-branch>`

### Linking plan PR ↔ target repo PR

Both PRs must reference each other:
- Hub plan PR description: `**Target repo PR:** <org>/<repo>#<number>`
- Target repo PR description: `**Hub plan PR:** <org>/<hub-repo-name>#<number>`

---

## Commands

### Hub-Level (`bin/dev`)

Use for coordination work (planning, dispatching, status):

| Command | Purpose |
|---------|---------|
| `bin/dev help` | Show all available commands |
| `bin/dev repo:list` | Show all repos with status |
| `bin/dev repo:sync [name]` | Update submodule(s) to latest main |
| `bin/dev repo:add <name> <url>` | Register new repo |
| `bin/dev repo:enter <name>` | Print context for a repo |
| `bin/dev repo:migrate <name>` | Move fallback-sdd into child repo |
| `bin/dev dispatch <epic-id> <task-id>` | Dispatch task to target repo |
| `bin/dev status [epic-id]` | Cross-repo epic status |
| `bin/dev wf:next` | Next actionable task |
| `bin/dev wf:validate` | Validate YAML manifests |
| `bin/dev resolve-spec <type> <repo>` | Find spec via cascade |
| `bin/dev note "msg"` | Record a finding |
| `bin/dev install-workflows <repo>` | Install caller workflows in a target repo for hub automation |

### Repo-Level (inside `repos/<name>/`)

Use for execution work (building, testing, linting):

- If repo has its own `sdd/`: use `repos/<name>/sdd/bin/dev`
- If repo uses fallback: check `fallback-sdd/<name>/config/commands.yaml` for the commands

Common repo-level commands: `build`, `test`, `lint`, `verify`, `branch`, `pr:draft`

---

## Rules

1. **Never run raw `git submodule` commands.** Use `bin/dev repo:*` instead.
2. **Never edit `repos.yaml` manually during task execution.** Use `bin/dev repo:add/remove`.
3. **One epic per developer at a time.** Check `bin/dev status` for active work.
4. **Blast radius constraints apply per-repo.** Only touch files declared in the plan.
5. **Always sync after completing a task.** Follow the Sync Rule above.
6. **Source code is the source of truth.** If code contradicts a spec, code wins.
7. **No code without an approved plan.** Use the Quick Fix track only for trivial (1-3 file) changes.
8. **Guardrails advise, humans decide.** All automated checks (branch naming, cross-references, blast radius, verification) are advisory. They never block merges.
9. **Keep YAML thin.** If a workflow step contains parsing, branching, validation, or repeated logic, move it into `bin/workflow-scripts/` or `bin/sync-state/` and cover it with tests.

---

## Fallback Resolution Pattern

For ANY SDD-related resource (specs, plans, commands):

```
Does repos/<name>/sdd/ exist?
├── YES → Use it (repo is self-sufficient)
└── NO  → Use fallback-sdd/<name>/ (hub provides structure)
```

This pattern applies to: agent-specs, pending requests, plans, config/commands.yaml, and all workflow artifacts.

---

## Available Skills

Skills are invoked naturally in Zed and Claude Code — describe what you want and the matching skill activates automatically. In VS Code, use `/sdd-<name>`.

| Skill | Description | Mode |
|-------|-------------|------|
| `sdd-bootstrap-hub` | Initialize hub context — generate overview docs, commands config, and fallback-sdd structures for registered repos | Coordination |
| `sdd-plan-task` | Create an implementation plan from an activated task request — produces `manifest.yaml`, `specification.md`, and stage files | Execution |
| `sdd-execute-plan` | Execute an approved plan — creates branch, opens draft PR, runs stages with verification checkpoints | Execution |
| `sdd-create-request` | Interactive technical discovery → write a standalone task request (no epic needed) | Coordination |
| `sdd-quick-fix` | Implement a small, obvious change (1–3 files, no design decisions) without a full plan | Execution |
| `sdd-create-epic` | Interactive product discovery → write a cross-repo epic with Definition of Done | Coordination |
| `sdd-break-down-epic` | Decompose an epic into a task graph, delivery manifest, and request shells | Coordination |
| `sdd-refine-request` | Refine an epic task shell into a fully specified request with acceptance criteria | Coordination |
| `sdd-dispatch-tasks` | Dispatch refined tasks to target repos and update statuses to `activated` | Coordination |
| `sdd-amend-epic` | Interactively amend an in-flight epic — add, split, remove, or resequence tasks | Coordination |
| `sdd-retro-analysis` | Retrospective analysis on completed epic metrics — talking points + process recommendations | Coordination |

**Skill files:** `.agents/skills/<name>/SKILL.md`
**VS Code aliases:** `.github/prompts/<name>.prompt.md`
**Copy-paste fallback:** `user-development/prompts/`

---

## Guardrails

Automation enforces these guardrails as **advisory checks only** (never blocking):

| Guardrail | Enforced by | Behavior |
|-----------|-------------|----------|
| Branch naming | `guardrails.yml`, `validate.yml` | Warns if branch doesn't match expected patterns |
| PR cross-references | `guardrails.yml`, `pr-lifecycle.yml` | Warns if plan/execution PRs are missing hub-target links |
| Blast radius (deterministic) | `guardrails.yml` | Warns if changed files are outside plan-scope paths |
| Blast radius (AI-assisted) | `ai-verification-gate.yml` | AI compares diff against manifest-declared scope |
| Title conventions | `guardrails.yml` | Warns if PR title doesn't follow conventional commit |
| Status transitions | `target-status-events.yml` | Rejects invalid transitions; logs reason |

## Automation Architecture

See `common-specs/git-workflow.md` for the full automation reference. Key components:

- **9 workflows** in `.github/workflows/` covering validation, ticket creation, dispatch, verification, post-merge sync, lifecycle, status events, completion, and guardrails
- **2 reusable workflows** (`receive-task.yml`, `notify-hub-verification.yml`) that target repos call via `uses:`
- **Sync-state engine** (`bin/sync-state.js`) with 11 commands for programmatic manifest updates
- **Install command** (`bin/dev install-workflows <repo>`) to bootstrap target repos with caller workflows

### Enterprise Features

| Feature | Implementation |
|---------|---------------|
| Error taxonomy | `bin/sync-state/errors.js` — 18 structured error codes (SDD-001 through SDD-018) across 5 categories |
| Audit trail | `.sdd-audit/` — JSONL audit log with correlation IDs for tracing dispatch chains |
| Integrity tokens | HMAC-SHA256 tokens on all `repository_dispatch` events, verified on receipt |
| Preflight checks | `.github/workflows/preflight-check.yml` — validates config, secrets, and branch naming as check runs |
| Backup before mutation | `--backup` flag on all sync-state write commands creates `.bak` files before changes |
| Check run guardrails | All guardrails post results as check runs (visible in branch protection UI), not just PR comments |
| Least-privilege permissions | Each workflow scoped to minimum required permissions |
| Quality checklists | `bin/sync-state/checklist.js` — per-plan-stage checklists generated and validated automatically |
| Cross-artifact analysis | `bin/sync-state/analyze.js` — validates spec ↔ tasks ↔ delivery consistency before dispatch |
| Constitution template | `agent-development/agent-specs/constitution-template.md` — engineering principles per managed repo |
| Troubleshooting runbook | `docs/TROUBLESHOOTING.md` — per-error-code resolution steps |
| Workflow reference | `docs/WORKFLOW-REFERENCE.md` — detailed workflow catalog with setup and trigger docs |
