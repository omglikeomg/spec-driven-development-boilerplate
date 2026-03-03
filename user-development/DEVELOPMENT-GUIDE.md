# Development Guide: Spec-Driven Agent Workflow

This document describes the development workflow used in this project. It follows a **Spec-Driven Development (SDD)** model where AI agents plan and implement tasks under human supervision. Every meaningful decision goes through a human approval gate.

> **Note:** This guide is part of the [SDD Boilerplate](../README.md). It is designed to be adopted as-is into new projects. You should not need to modify this file unless you want to change the workflow itself — the project-specific details live in `agent-development/agent-specs/`.

---

## Table of Contents

- [Philosophy](#philosophy)
- [Directory Layout](#directory-layout)
- [The Pipeline](#the-pipeline)
  - [Stage 1: Request](#stage-1-request)
  - [Stage 2: Plan](#stage-2-plan)
  - [Stage 3: Approve](#stage-3-approve)
  - [Stage 4: Execute](#stage-4-execute)
  - [Stage 5: Done](#stage-5-done)
- [The Quick Fix Track](#the-quick-fix-track)
  - [When to Use It](#when-to-use-it)
  - [How It Works](#how-it-works-1)
  - [Escape Hatch](#escape-hatch)
  - [Log Files](#log-files)
- [Plan Structure](#plan-structure)
  - [Plan Folder Layout](#plan-folder-layout)
  - [manifest.json](#manifestjson)
  - [specification.md](#specificationmd)
  - [Stage Files](#stage-files)
  - [Mandatory Final Stages](#mandatory-final-stages)
- [File Lifecycle](#file-lifecycle)
- [The Open Questions Mechanism](#the-open-questions-mechanism)
- [Git Workflow & Commits](#git-workflow--commits)
  - [Branching](#branching)
  - [Commit Conventions](#commit-conventions)
  - [Commit Timing](#commit-timing)
  - [Versioning](#versioning)
- [Prompt Templates](#prompt-templates)
- [Document Templates](#document-templates)
- [Project Specs](#project-specs)
- [Conventions](#conventions)
- [Quick Reference: Common Actions](#quick-reference-common-actions)

---

## Philosophy

This project follows a **spec-driven development** model:

1. **Humans define *what* to build** — through task requests and by resolving open questions.
2. **Agents figure out *how* to build it** — through detailed implementation plans broken into stages.
3. **Humans approve before anything is built** — every plan goes through a review gate.
4. **Agents execute approved plans** — mechanically following the stages and steps that were already vetted.

The key principle is that **no code is written without an approved plan**, and **no plan is approved without human review**. This creates a clear audit trail and prevents agents from making unsupervised architectural decisions.

---

## Directory Layout

```
user-development/                   ← Human-facing development assets
├── DEVELOPMENT-GUIDE.md            ← You are here
└── prompts/                        ← Reusable prompt templates for humans
    ├── 1-plan-task.md
    ├── 2-execute-plan.md
    ├── 3-request-feature.md
    └── 4-quick-fix.md

agent-development/                  ← Agent-only pipeline (requests, plans, execution)
├── agent-specs/                    ← Project-level specifications (read-only context)
│   ├── agent-instructions.md       ← Coding standards and dos/don'ts
│   ├── application-overview.md     ← What the app does
│   ├── architecture-breakdown.md   ← Folder structure, design patterns, tech stack
│   └── FOLDER-STRUCTURE.md         ← Quick-reference project directory tree & module deps
├── pending/                        ← Task requests waiting to be planned
│   └── _TEMPLATE-request.md        ← Template for new requests
├── plans/                          ← Implementation plans waiting for approval
│   └── _templates/                 ← Templates for creating new plan folders
│       ├── manifest.json
│       ├── specification.md
│       └── stage.md
├── queued/                         ← Approved plan folders ready for execution
└── done/                           ← Completed work
    ├── plans/                      ← Executed plan folders (archive)
    ├── requests/                   ← Fulfilled requests (archive)
    └── quick-fixes/                ← Quick fix log files (YYYYMMDD-description.md)
```

---

## The Pipeline

Every piece of work flows through five stages. Agents read source code directly as the source of truth.

```
 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │ REQUEST  │────▶│   PLAN   │────▶│ APPROVE  │────▶│ EXECUTE  │────▶│   DONE   │
 │          │     │          │     │          │     │          │     │          │
 │ (human + │     │ (agent)  │     │ (human)  │     │ (agent)  │     │ (auto)   │
 │  agent)  │     │          │     │          │     │          │     │          │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
   pending/         plans/        plans/ → queued/     queued/       done/plans/
                                                                    done/requests/
```

### Stage 1: Request

**Who:** Human (optionally assisted by an agent using prompt `3-request-feature.md`).

**What happens:**
- A task request file is created in `agent-development/pending/` following the `_TEMPLATE-request.md` structure.
- The file is numbered sequentially (e.g., `4-new-feature.md` if `3-makefile.md` is the highest existing number).
- The request defines *what* needs to be done — goal, context, requirements, and a checklist — but NOT *how*.

**Output:** A new file in `agent-development/pending/`.

### Stage 2: Plan

**Who:** An AI agent, guided by prompt `user-development/prompts/1-plan-task.md`.

**What happens:**
- The agent reads all `agent-development/agent-specs/` documents for context.
- The agent reads the specific task request from `agent-development/pending/`.
- The agent reads the relevant source code to understand the current state of the project (the code is the source of truth). `agent-development/agent-specs/FOLDER-STRUCTURE.md` can be used for quick orientation.
- The agent produces a **plan folder** containing a `manifest.json`, `specification.md`, and one or more numbered stage files — following the templates in `agent-development/plans/_templates/`.
- The agent surfaces any ambiguities or decisions it cannot make on its own in the **"Open Questions & Decisions"** section of `specification.md`.

**Output:** A new plan folder in `agent-development/plans/` (e.g., `plans/1-docker-infrastructure/`).

### Stage 3: Approve

**Who:** Human (you).

**What happens:**
- You read the `specification.md` in the plan folder carefully.
- You review the **"Open Questions & Decisions"** section:
  - For each question marked `PENDING`, you write your decision inline.
  - You can also modify any part of the plan if you disagree with the agent's approach — including stage files, the manifest, or the specification itself.
- Once satisfied, you **move the entire plan folder** from `plans/` to `queued/`.

**The move is the approval signal.** A plan folder in `queued/` means "this has been reviewed and is ready to execute." A plan folder still in `plans/` means "this is a draft — do not implement."

**Output:** The plan folder moves from `agent-development/plans/` → `agent-development/queued/`, with all open questions resolved.

### Stage 4: Execute

**Who:** An AI agent, guided by prompt `user-development/prompts/2-execute-plan.md`.

**What happens:**
- The agent reads the `manifest.json` and `specification.md` from the plan folder in `agent-development/queued/`.
- The agent verifies that all open questions have been resolved (no `PENDING` markers remain).
- The agent executes stages in order, reading each stage's instruction file and following it precisely.
- After each stage, the agent updates `manifest.json` (stage status, current_stage).
- After all stages pass, the agent performs housekeeping moves:
  - Plan folder: `agent-development/queued/` → `agent-development/done/plans/`
  - Request: `agent-development/pending/` → `agent-development/done/requests/`

**Output:** Code is written/modified. Plan folder and request are archived in `agent-development/done/`.

### Stage 5: Done

**Who:** Automatic (performed by the executing agent).

**What happens:**
- The plan folder and its originating request are both moved to `agent-development/done/` subdirectories.
- They serve as a historical record of what was built and why.

---

## The Quick Fix Track

Not every change warrants the full Request → Plan → Approve → Execute pipeline. Extracting a constant, renaming a route, fixing a typo — these are mechanically obvious changes with no design decisions to make. Forcing them through the full pipeline creates friction without adding value.

The **quick fix track** is a lightweight alternative for small, unambiguous changes.

### When to Use It

A change qualifies as a quick fix if **all** of the following are true:

- It touches **1–3 files** (not counting spec/doc updates if needed)
- It involves **no design decisions or ambiguity** — there is one obviously correct way to do it
- It requires **no new dependencies**
- It does **not change public APIs, database schemas, or architectural patterns**
- It can be **fully described in a sentence or two**

If any of these criteria aren't met, use the full pipeline instead.

### How It Works

1. Open a new agent conversation.
2. Paste the contents of `user-development/prompts/4-quick-fix.md`.
3. Replace `<CHANGE_DESCRIPTION>` with a plain-language description of the change.
4. The agent reads `agent-specs/` for context, reads the relevant source files, makes the change, runs verification, and produces a summary.
5. The agent creates a log file in `agent-development/done/quick-fixes/` documenting what was changed.

There is **no plan folder, no approval gate, and no request file**. The audit trail is the log file.

### Escape Hatch

If the agent discovers mid-change that the work is larger or more ambiguous than expected, it **must stop** and recommend creating a full task request instead. The quick fix prompt explicitly instructs agents to do this — it is not optional.

### Log Files

Each quick fix produces a single Markdown file in `agent-development/done/quick-fixes/` with the naming pattern:

```
YYYYMMDD-short-description.md
```

If multiple quick fixes happen on the same date, each gets its own file: `20250115-extract-api-constant.md`, `20250115-fix-typo-in-error-message.md`.

Each log file records: what changed, which files were modified, verification results, and whether any spec/doc updates were made.

---

## Plan Structure

Plans are **folders**, not single files. This structure allows large tasks to be broken into independently verifiable stages while keeping everything organized in one place.

### Plan Folder Layout

```
N-short-name/
├── manifest.json                    ← Authoritative record of task state and stages
├── specification.md                 ← Human-readable overview (for review and approval)
├── 1-first-stage-name.md            ← Stage 1 instructions for the implementing agent
├── 2-second-stage-name.md           ← Stage 2 instructions
├── ...                              ← As many stages as needed
├── N-1-spec-updates.md              ← MANDATORY penultimate stage
└── N-documentation-updates.md       ← MANDATORY final stage
```

### manifest.json

The **single authoritative record** of task state. It contains:

- **`plan_metadata`** — task ID, name, status (`draft` → `pending-approval` → `queued` → `in-progress` → `done`), total stages, current stage, timestamps.
- **`dependencies`** — required prior tasks, new packages to install, affected project modules.
- **`stages`** — an ordered array where each entry defines:
  - `stage_id` and `name`
  - `description` — what the stage accomplishes
  - `instruction_file` — which `.md` file contains the detailed steps
  - `status` — `todo` | `in-progress` | `done` | `skipped` | `failed`
  - `complexity` — `small` | `medium` | `large` (if `large`, consider splitting)
  - `context_files` — files the agent must read before starting the stage
  - `output_files` — files the agent will create or modify
  - `verification_commands` — commands to run after the stage completes
  - `rollback_plan` — how to undo this stage if it fails

The executing agent updates `manifest.json` after each stage to track progress.

### specification.md

The **human-readable plan overview** used during the approval process. It contains:

- **Overview** — what the plan accomplishes, scope, constraints
- **Reference Documents** — what the implementing agent must read
- **Pre-Conditions** — what must be true before execution
- **Stages** — a summary of each stage (name, complexity, what it reads/writes) so the reviewer can assess scope without reading every stage file
- **Open Questions & Decisions** — ambiguities that require human input (the most important section during review)
- **File Manifest** — every file created or modified across all stages, with the stage number
- **Post-Completion Checklist** — final verification items after all stages are done
- **Notes for the Implementing Agent** — additional guidance

### Stage Files

Each stage file (`1-stage-name.md`, `2-stage-name.md`, etc.) is a self-contained instruction set for the implementing agent. It contains:

- **Objective** — what this stage accomplishes
- **Resource Constraints (Blast Radius)** — explicitly lists which files the agent is allowed to read and write. Any file not listed is out of scope. This prevents agents from making unscoped changes.
- **Prerequisites** — what must be true before this stage starts (typically: previous stage is `done`)
- **Instructions** — step-by-step actions with file paths, code snippets, and shell commands
- **Verification** — automated checks (commands) and manual verification items
- **Rollback Plan** — how to undo this stage's changes if something goes wrong

Not all plans need multiple stages. Small tasks can have a **single implementation stage** plus the two mandatory final stages. However, all plans must follow the same folder structure for consistency.

### Mandatory Final Stages

Every plan **must** end with these two stages (renumbered to fit the plan's stage count):

1. **Spec Updates (penultimate stage):** Update `agent-development/agent-specs/` files (architecture breakdown, folder structure, agent instructions) to reflect any changes introduced by the plan. If no spec changes are needed, the stage is marked `skipped` with a justification.

2. **Documentation Updates (final stage):** Update human-facing documentation — `README.md`, `DEVELOPMENT-GUIDE.md`, and any other relevant docs — to reflect changes introduced by the plan. If no doc changes are needed, the stage is marked `skipped` with a justification.

These two stages ensure that the project's context (for agents) and documentation (for humans) stay accurate after every change.

---

## File Lifecycle

A task request file moves through the system like this:

```
agent-development/pending/1-docker-infrastructure.md      ← Created (Stage 1)
  └─ stays here while plan is being written and reviewed
  └─ moved to agent-development/done/requests/ after execution (Stage 4)
```

A plan folder moves through the system like this:

```
agent-development/plans/1-docker-infrastructure/          ← Created by planning agent (Stage 2)
  └─ human reviews specification.md, resolves open questions (Stage 3)
agent-development/queued/1-docker-infrastructure/         ← Moved here when approved (Stage 3)
  └─ executing agent reads stages and implements (Stage 4)
agent-development/done/plans/1-docker-infrastructure/     ← Moved here after execution (Stage 4)
```

---

## The Open Questions Mechanism

This is the most important human-in-the-loop mechanism in the workflow.

### Why It Exists

AI agents are good at following specifications but bad at making subjective decisions. When a planning agent encounters something ambiguous — a naming choice, a trade-off between simplicity and flexibility, a missing requirement — it should **not guess**. Instead, it writes up the question in the plan's `specification.md` under the **"Open Questions & Decisions"** section.

### How It Works

1. **Planning agent** writes each question with:
   - A short title
   - Context explaining why the question matters
   - Concrete options (A, B, C...) with trade-offs
   - The agent's recommendation (or "no recommendation")
   - `Human decision: PENDING`

2. **Human reviewer** (during approval) replaces `PENDING` with their chosen option and any notes.

3. **Executing agent** (during execution) checks that no `PENDING` markers remain. If any do, it **stops and refuses to execute**. Resolved decisions are treated as binding requirements.

### Example

Before approval:
```
### Q1: Should the config file use TOML or JSON?

**Context:** TOML is more human-readable for config; JSON is already used elsewhere.

**Options:**
- **A)** TOML — better readability, but adds a dependency.
- **B)** JSON — consistent with existing files, no new deps.

**Agent's recommendation:** B (JSON) — consistency wins for a small config file.

**Human decision:** `PENDING`
```

After approval:
```
**Human decision:** B — agreed, let's keep JSON. Also make sure we pretty-print with 2-space indent.
```

---

## Git Workflow & Commits

All development happens on **feature branches**. Agents never commit directly to `main`. Each branch results in a Pull Request (PR) that the human reviews before merging. This gives you a clean rollback mechanism at every level — revert a single commit (one stage), revert the whole PR (one feature), or cherry-pick specific stages into a hotfix branch.

The full details live in `agent-development/agent-specs/git-workflow.md`, which agents read before making any commits. This section is a human-facing summary.

### Branching

The human creates the branch before starting an agent conversation. Agents work on whatever branch is currently checked out — they will verify they're not on `main` and refuse to proceed if they are.

**Branch naming format:**

```
<type>/<ticket-id>-<short-description>
```

Examples: `feat/PROJ-123-add-user-preferences`, `fix/correct-pagination-offset`, `chore/update-dependencies`.

The ticket ID is optional. If present in the branch name, agents automatically include it in every commit message. Agents detect ticket IDs by scanning for a pattern matching `[A-Z][A-Z0-9]+-\d+` (e.g., `PROJ-123`, `SDD-42`). If your issue tracker uses a different format, update the pattern in `git-workflow.md`.

### Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) (v1.0.0):

```
<type>(<optional-scope>): <ticket-id> <description>
```

**With ticket ID:** `feat(books): PROJ-123 add pagination to list endpoint`
**Without ticket ID:** `refactor(config): extract database URL into constant`

Agents choose the commit type based on what the change actually does — not based on whether it's a plan or quick fix. A quick fix that corrects a bug is `fix`. A plan stage that adds a feature is `feat`. A stage that only adds tests is `test`.

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`, `build`, `ci`, `perf`.

For breaking changes, agents use `!` after the type: `feat(api)!: PROJ-999 replace REST endpoints with GraphQL`.

### Commit Timing

**During plan execution:** One commit per stage, made after the stage's verification checks pass and `manifest.json` has been updated. Each commit in the branch represents a verified, self-contained unit of work. After all stages are complete, the archive file moves (plan folder → `done/plans/`, request → `done/requests/`) get a separate `chore` commit.

**During quick fixes:** One commit for the entire fix, made after verification passes and the quick fix log file has been created.

This means you can:
- **Rollback one stage** — `git revert <stage-commit>` (though later stages may depend on it)
- **Rollback an entire feature** — revert the PR
- **Inspect stage-by-stage progress** — each commit in the branch corresponds to one stage
- **Resume interrupted work** — if the agent stops mid-plan, `manifest.json` tracks which stages are `done` and the git log confirms what's been committed

### Versioning

Agents do **not** bump version numbers or edit version files. Versioning is a release concern handled by the human or CI tooling when the PR is merged.

However, the commit types chosen by agents signal the expected version impact:

| Change Type | Expected Version Impact | Signal |
|---|---|---|
| Quick fixes (bug fixes, typo corrections) | **PATCH** (0.0.x) | `fix` commits |
| Plan execution (new features, modules) | **MINOR** (0.x.0) | `feat` commits |
| Plan execution (breaking changes) | **MAJOR** (x.0.0) | `feat!` or `BREAKING CHANGE` footer |

If your project uses automated versioning tools (e.g., `semantic-release`, `standard-version`, `changesets`), the conventional commit messages provide the input those tools need.

---

## Prompt Templates

Located in `user-development/prompts/`. These are copy-paste prompts the human uses to start agent conversations.

| Prompt | File | Purpose |
|---|---|---|
| Plan a Task | `user-development/prompts/1-plan-task.md` | Give to an agent to produce a plan folder from a `pending/` request |
| Execute a Plan | `user-development/prompts/2-execute-plan.md` | Give to an agent to implement an approved plan from `queued/` |
| Request a Feature | `user-development/prompts/3-request-feature.md` | Give to an agent to write a new task request in `pending/` |
| Quick Fix | `user-development/prompts/4-quick-fix.md` | Give to an agent to make a small, unambiguous change and log it |

Each prompt has a `<PLACEHOLDER>` that you replace with a file reference before using it.

---

## Document Templates

| Template | Location | Used For |
|---|---|---|
| Request template | `agent-development/pending/_TEMPLATE-request.md` | Creating new task requests |
| Plan templates | `agent-development/plans/_templates/` | Creating new plan folders |
| ↳ manifest.json | `agent-development/plans/_templates/manifest.json` | Task state, stages, and context tracking |
| ↳ specification.md | `agent-development/plans/_templates/specification.md` | Human-readable plan overview |
| ↳ stage.md | `agent-development/plans/_templates/stage.md` | Per-stage instruction template |

Agents are instructed to follow these templates exactly when creating new documents.

---

## Project Specs

The `agent-development/agent-specs/` directory contains documents that provide global context to every agent conversation:

| Document | Path | Purpose |
|---|---|---|
| Application Overview | `agent-development/agent-specs/application-overview.md` | What the application does, its core workflows, and UX goals |
| Architecture Breakdown | `agent-development/agent-specs/architecture-breakdown.md` | Folder structure, design patterns, technology stack |
| Agent Instructions | `agent-development/agent-specs/agent-instructions.md` | Coding standards, dos/don'ts, testing expectations |
| Folder Structure | `agent-development/agent-specs/FOLDER-STRUCTURE.md` | Complete project directory tree and module dependency graph |
| Git Workflow | `agent-development/agent-specs/git-workflow.md` | Branching strategy, commit conventions, versioning expectations |

These files are the **shared context** for the project. If a plan or request contradicts them, the specs take precedence (or the specs should be updated first).

> **Important:** When you first adopt this boilerplate, you must replace the example content in the `agent-specs/` files with your actual project's details. The examples are there to show you the level of detail that works well — they are not meant to be used as-is. The `git-workflow.md` file is designed as a starting point with sensible defaults — tweak the ticket ID pattern, branch naming format, and versioning expectations to match your team's conventions.

---

## Conventions

### File Naming

- **Requests:** `N-short-kebab-name.md` (e.g., `3-makefile-and-dev-commands.md`)
- **Plan folders:** `N-short-kebab-name/` (e.g., `3-makefile-and-dev-commands/`)
- **Stage files:** `N-stage-name.md` inside the plan folder (e.g., `1-project-initialization.md`, `2-directory-structure.md`)
- **Quick fix logs:** `YYYYMMDD-short-description.md` (e.g., `20250115-extract-api-base-url-constant.md`)
- **Templates:** `_templates/` or `_TEMPLATE-*` (underscore prefix keeps them sorted first)
- **Task numbers** are sequential across `agent-development/pending/` and `agent-development/done/requests/` combined. Quick fixes do not consume task numbers.

### Configuration Files

This project uses a **template-and-copy** convention for configuration:

| Git-tracked template (committed) | Runtime copy (gitignored) | Purpose |
|---|---|---|
| `.env.example` | `.env` | Environment variables |

After cloning, users must copy the template files to their runtime locations. The `.gitignore` should be configured to ignore the runtime copies. Never commit secrets or personal paths.

### Spec Updates

If a task introduces new modules, interfaces, or changes the architecture, the executing agent must update `agent-development/agent-specs/architecture-breakdown.md`, `agent-development/agent-specs/FOLDER-STRUCTURE.md`, and/or `agent-development/agent-specs/agent-instructions.md` as part of the plan's mandatory penultimate stage. These updates ensure future agents have accurate context.

### Documentation Updates

If a task changes user-facing behavior, the executing agent must update `README.md` and any other relevant human-facing documentation as part of the plan's mandatory final stage. This ensures that the project's documentation stays in sync with the code.

---

## Quick Reference: Common Actions

### "I want to add a new feature"

1. Open a new agent conversation.
2. Paste the contents of `user-development/prompts/3-request-feature.md`.
3. Replace `<FEATURE_DESCRIPTION>` with what you want.
4. The agent creates a numbered file in `agent-development/pending/`.

### "I want to plan the next task"

1. Open a new agent conversation.
2. Paste the contents of `user-development/prompts/1-plan-task.md`.
3. Replace `<TASK_FILE>` with a reference to the `agent-development/pending/` file (e.g., `@1-docker-infrastructure.md`).
4. The agent reads specs and source code, then creates a plan folder in `agent-development/plans/`.
5. **Review the `specification.md` and resolve all open questions.**
6. Move the entire plan folder from `agent-development/plans/` to `agent-development/queued/`.

### "I want to execute an approved plan"

1. Open a new agent conversation.
2. Paste the contents of `user-development/prompts/2-execute-plan.md`.
3. Replace `<PLAN_FOLDER>` with a reference to the `agent-development/queued/` folder (e.g., `@1-docker-infrastructure`).
4. The agent reads `manifest.json`, executes stages in order, updates stage statuses, and archives both the plan folder and request to `agent-development/done/`.

### "I want to make a small, obvious change"

1. Open a new agent conversation.
2. Paste the contents of `user-development/prompts/4-quick-fix.md`.
3. Replace `<CHANGE_DESCRIPTION>` with what you need changed (e.g., "Extract the repeated `"/api/v1"` string into a constant in `src/common/constants.ts`").
4. The agent makes the change, runs verification, and creates a log file in `agent-development/done/quick-fixes/`.
5. If the agent determines the change is too large or ambiguous, it will stop and recommend the full pipeline instead.

### "I want to see what's in progress"

- **What needs planning?** → Check `agent-development/pending/` (minus `_TEMPLATE-request.md`)
- **What's been planned but not approved?** → Check `agent-development/plans/` (minus `_templates/`)
- **What's approved and ready to build?** → Check `agent-development/queued/`
- **What's done?** → Check `agent-development/done/plans/`, `agent-development/done/requests/`, and `agent-development/done/quick-fixes/`
- **What stage is a plan on?** → Read `manifest.json` in the plan folder — check `current_stage` and each stage's `status`
