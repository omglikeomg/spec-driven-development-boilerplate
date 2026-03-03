# Spec-Driven Development (SDD) Boilerplate

A ready-to-adopt folder structure and workflow for building software projects with AI agents under human supervision. Clone this repo, replace the example content with your project's details, and start shipping features through a structured request → plan → approve → execute pipeline.

## What Is Spec-Driven Development?

SDD is a development model where:

1. **Humans define _what_ to build** — through task requests and by resolving open questions.
2. **Agents figure out _how_ to build it** — through detailed, step-by-step implementation plans.
3. **Humans approve before anything is built** — every plan goes through a review gate.
4. **Agents execute approved plans** — mechanically following steps that were already vetted.

No code is written without an approved plan. No plan is approved without human review. This creates a clear audit trail and prevents agents from making unsupervised architectural decisions.

## Why Use This?

- **Consistency:** Every feature follows the same pipeline, regardless of which agent or IDE you use.
- **Control:** The open questions mechanism forces agents to surface ambiguities instead of guessing. You make the decisions; they do the work.
- **Context:** The `agent-specs/` directory gives every agent conversation the same foundational knowledge about your project — no more re-explaining your architecture in every chat.
- **History:** Completed plans and requests in `done/` serve as an audit trail of what was built, why, and how.
- **Onboarding:** New contributors (human or AI) can read the specs and development guide to get up to speed without a walkthrough.

## Repository Structure

```
sdd-boilerplate/
├── agent-development/                  ← Agent-facing pipeline
│   ├── agent-specs/                    ← Project context (read by every agent)
│   │   ├── application-overview.md     ← What the app does (replace with yours)
│   │   ├── architecture-breakdown.md   ← Folder structure, patterns, tech stack (replace with yours)
│   │   ├── agent-instructions.md       ← Coding standards, dos/don'ts (customize for your stack)
│   │   ├── git-workflow.md             ← Branching, commit conventions, versioning (customize)
│   │   └── FOLDER-STRUCTURE.md         ← Quick-reference directory tree (replace with yours)
│   ├── pending/                        ← Task requests waiting to be planned
│   │   └── _TEMPLATE-request.md
│   ├── plans/                          ← Plan folders waiting for approval
│   │   └── _templates/                 ← Templates for creating new plan folders
│   │       ├── manifest.json           ← Task state, stages, context tracking
│   │       ├── specification.md        ← Human-readable plan overview
│   │       └── stage.md               ← Per-stage instruction template
│   ├── queued/                         ← Approved plan folders ready for execution
│   └── done/                           ← Completed work (archive)
│       ├── plans/                      ← Executed plan folders
│       ├── requests/                   ← Fulfilled request files
│       └── quick-fixes/                ← Quick fix log files (YYYYMMDD-description.md)
│
├── user-development/                   ← Human-facing development assets
│   ├── DEVELOPMENT-GUIDE.md            ← Full workflow documentation
│   └── prompts/                        ← Copy-paste prompts for agent conversations
│       ├── 1-plan-task.md              ← "Plan this task request"
│       ├── 2-execute-plan.md           ← "Execute this approved plan"
│       ├── 3-request-feature.md        ← "Write a task request for this feature"
│       └── 4-quick-fix.md             ← "Make a small, obvious change and log it"
│
└── README.md                           ← You are here
```

## Quick Start

### 1. Clone or Copy the Boilerplate

```bash
git clone <this-repo-url> my-new-project
cd my-new-project
rm -rf .git && git init  # Start fresh git history
```

### 2. Replace the Example Content in `agent-specs/`

The four files in `agent-development/agent-specs/` contain **example content** for a fictional NestJS book-collection API. They demonstrate the level of detail that works well with agents, but they are not meant to be used as-is.

| File | What to Put Here |
|---|---|
| `application-overview.md` | What your app does, core workflows, key UX goals |
| `architecture-breakdown.md` | Your folder structure, design patterns, tech stack, key decisions |
| `agent-instructions.md` | Coding standards, dos/don'ts, testing expectations, naming conventions |
| `git-workflow.md` | Branching strategy, commit message format, ticket ID pattern, versioning expectations |
| `FOLDER-STRUCTURE.md` | Your project's actual directory tree and module dependency graph |

> **Tip:** The `agent-instructions.md` and `git-workflow.md` files are designed as starting points that you'll tweak over time. Every time you correct an agent manually, consider adding a rule there so it doesn't happen again. For `git-workflow.md`, you'll likely want to update the ticket ID regex pattern to match your issue tracker.

### 3. Read the Development Guide

Open `user-development/DEVELOPMENT-GUIDE.md` for the full workflow documentation, including:

- The five-stage pipeline (Request → Plan → Approve → Execute → Done)
- How plans are structured as folders with a manifest, specification, and stage files
- How the open questions mechanism works
- How to use the prompt templates
- File lifecycle and naming conventions

### 4. Understand the Two Tracks

This boilerplate provides **two tracks** for getting work done:

| Track | When to Use | Prompt | Audit Trail |
|---|---|---|---|
| **Full Pipeline** | Features, refactors, anything with design decisions or touching 4+ files | `1-plan-task.md` → `2-execute-plan.md` | Request file + plan folder in `done/` |
| **Quick Fix** | Small, mechanically obvious changes (1–3 files, no ambiguity) | `4-quick-fix.md` | Log file in `done/quick-fixes/` |

The full pipeline is the default. Use the quick fix track only when a change is truly trivial — if the agent discovers it's bigger than expected, it will stop and recommend the full pipeline instead. See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#the-quick-fix-track) for details.

### 5. Create Your First Task Request

Option A — write it yourself using `agent-development/pending/_TEMPLATE-request.md` as a guide.

Option B — paste the contents of `user-development/prompts/3-request-feature.md` into an agent conversation and describe what you want. The agent will create a properly formatted request file in `pending/`.

### 6. Plan, Approve, Execute

Follow the pipeline described in the Development Guide:

```
 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │ REQUEST  │────▶│   PLAN   │────▶│ APPROVE  │────▶│ EXECUTE  │────▶│   DONE   │
 │ (human)  │     │ (agent)  │     │ (human)  │     │ (agent)  │     │ (auto)   │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                   creates a        reviews spec,     executes stages   plan folder &
                   plan folder       resolves Qs,      in order,         request archived
                   with stages       moves folder      updates manifest  in done/
```

## What's Included as Examples

To help you understand the expected level of detail, this boilerplate includes:

### Example Agent Specs
All four `agent-specs/` files contain example content for a fictional TypeScript/NestJS project. Each file has a prominent banner reminding you to replace it with your own content.

### Example Request & Plan (in `done/`)
- `agent-development/done/requests/0-project-bootstrapping.md` — shows what a well-structured task request looks like.
- `agent-development/done/plans/0-project-bootstrapping/` — shows what a complete plan folder looks like, including:
  - `manifest.json` — task metadata, 5 stages with context/output files and verification commands
  - `specification.md` — human-readable overview with resolved open questions and a 41-file manifest
  - `1-project-initialization.md` through `5-documentation-updates.md` — detailed stage instructions with blast radius constraints, step-by-step actions, and rollback plans
  - Two mandatory final stages: spec updates (stage 4) and documentation updates (stage 5)

### Example Pending Requests
Three pre-written task requests in `agent-development/pending/` demonstrate common early-project tasks related to local development infrastructure:

| Request | Purpose |
|---|---|
| `1-docker-infrastructure.md` | Dockerfiles, docker-compose with configurable ports, health checks |
| `2-config-and-dotenv.md` | Configuration module, `.env` management, startup validation |
| `3-makefile-and-dev-commands.md` | Makefile with grouped targets for every common dev operation |

These are real, usable requests — if your project needs Docker/config/Makefile setup, you can use them directly (after updating the project-specific details). Otherwise, they serve as reference for the level of detail that produces the best results.

## Adapting to Your Stack

This boilerplate is **language-agnostic** at the workflow level. The pipeline, templates, prompts, and directory structure work with any technology stack. The only files that reference a specific language are:

- `agent-development/agent-specs/*` — replace with your project's details
- `agent-development/pending/1-3-*.md` — the example pending requests assume TypeScript/NestJS, but the patterns (Docker, config, Makefile) apply broadly

The workflow has been battle-tested with Go and TypeScript projects, but the same structure works for Python, Rust, Java, or any language where you want structured, human-supervised AI development.

### The Quick Fix Track

Not every change needs the full pipeline. The **quick fix track** (`user-development/prompts/4-quick-fix.md`) handles small, mechanically obvious changes — extracting a constant, renaming a route, updating a config value. The agent makes the change directly, runs verification, and logs the result as a dated file in `agent-development/done/quick-fixes/`. No plan folder, no approval gate, no request file. If the agent discovers the change is larger than expected, it stops and recommends the full pipeline. See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#the-quick-fix-track) for qualifying criteria and details.

### Git Workflow & Commits

All development happens on feature branches — never on `main`. Agents verify they're on a feature branch before making any changes and refuse to proceed if they're on `main`. Each completed stage of a plan gets its own [Conventional Commit](https://www.conventionalcommits.org/), so you can rollback individual stages via `git revert` or an entire feature by reverting the PR. If a ticket ID (e.g., `PROJ-123`) is detected in the branch name, agents automatically include it in every commit message. Agents do not bump version numbers — that's a release concern for the human or CI. See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#git-workflow--commits) for full details and `agent-development/agent-specs/git-workflow.md` for the spec agents follow.

## Key Concepts

### Plans Are Folders, Not Files

Each plan is a folder containing a `manifest.json` (authoritative task state), a `specification.md` (human-readable overview for approval), and numbered stage files with detailed implementation instructions. This structure allows large tasks to be broken into focused, independently verifiable stages while keeping small tasks simple (one implementation stage + two mandatory final stages). See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#plan-structure) for the full breakdown.

### The Open Questions Mechanism

When a planning agent encounters ambiguity — a naming choice, a trade-off, a missing requirement — it writes up the question in the plan's `specification.md` under the "Open Questions & Decisions" section instead of guessing. Each question includes options with trade-offs and a recommendation. The human resolves all questions before moving the plan folder to `queued/`. See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#the-open-questions-mechanism) for details.

### Blast Radius Constraints

Each stage file explicitly declares which files the implementing agent is allowed to read and write. Anything not listed is out of scope. This prevents agents from making unscoped changes and makes it clear exactly what each stage touches.

### Source Code Is the Source of Truth

Agents read the actual source code to understand the current state of the project. The spec files provide context and conventions, but if there's ever a conflict between a spec and what's in the code, the code wins (and the spec should be updated).

### Mandatory Final Stages

Every plan must end with two stages: **spec updates** (sync `agent-development/agent-specs/` with changes) and **documentation updates** (sync `README.md` and human-facing docs). This ensures that both agent context and human documentation stay accurate after every change.

## FAQ

**Q: Does this work with [Cursor / Windsurf / Copilot / Claude / etc.]?**
A: Yes. The prompts in `user-development/prompts/` are plain Markdown that you paste into any agent conversation. The workflow doesn't depend on any specific tool.

**Q: Can I skip the planning step for small tasks?**
A: For truly small, mechanically obvious changes (extracting a constant, renaming a route, fixing a typo), use the **quick fix track** — paste `user-development/prompts/4-quick-fix.md` into an agent conversation. It bypasses the full pipeline but still produces an audit trail in `agent-development/done/quick-fixes/`. For anything with design decisions or touching more than a few files, use the full pipeline — even small plans catch edge cases early.

**Q: How detailed should the agent-specs files be?**
A: As detailed as possible without becoming stale. The example files show a good level of detail. When in doubt, be more specific — agents perform better with explicit constraints than with vague guidelines.

**Q: What if I disagree with the agent's plan?**
A: Modify the plan directly before moving the folder to `queued/`. You can rewrite the specification, change stage instructions, adjust the manifest, or add constraints. The plan folder in `queued/` is the final spec — the executing agent follows it exactly.

**Q: Do all plans need multiple stages?**
A: No. Small tasks can have a single implementation stage. However, all plans must follow the same folder structure (manifest + specification + stage files) and must end with the two mandatory final stages (spec updates and documentation updates). These final stages can be marked `skipped` if genuinely no changes are needed.

**Q: What happens if execution is interrupted mid-plan?**
A: The `manifest.json` tracks `current_stage` and each stage's `status`. When you start a new agent conversation to resume, the agent reads the manifest, sees which stages are already `done`, and picks up from where it left off.

**Q: Should I commit the `done/` files?**
A: Yes. They serve as a project history and help future agents (and humans) understand why things were built the way they were.

**Q: Do agents handle git commits automatically?**
A: Yes. Agents commit after each plan stage passes verification (one commit per stage) and once for the entire quick fix. They use [Conventional Commits](https://www.conventionalcommits.org/) and automatically include ticket IDs extracted from the branch name. However, agents never create branches, merge to `main`, or bump version numbers — those are human/CI responsibilities.

## License

MIT — use this however you like.