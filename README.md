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
│   │   ├── agent-instructions.md       ← Coding standards, dos/don'ts, naming, testing (customize for your stack)
│   │   ├── agent-workflow.md           ← Execution rules, blast radius, commit timing, spec/doc updates (system-level, rarely customized)
│   │   ├── application-overview.md     ← What the app does (replace with yours)
│   │   ├── architecture-breakdown.md   ← Folder structure, patterns, tech stack, module deps (replace with yours)
│   │   └── git-workflow.md             ← Branching, commit conventions, versioning (customize)
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
│       ├── 0-bootstrap-specs.md        ← "Bootstrap agent-specs/ for a new project"
│       ├── 1-plan-task.md              ← "Plan this task request"
│       ├── 2-execute-plan.md           ← "Execute this approved plan"
│       ├── 3-request-feature.md        ← "Write a task request for this feature"
│       └── 4-quick-fix.md             ← "Make a small, obvious change and log it"
│
└── README.md                           ← You are here
```

## Quick Start

Follow these steps to adopt SDD for a new project. The whole process takes about 10 minutes.

### Step 1: Clone and Reset Git History

```bash
git clone <this-repo-url> my-new-project
cd my-new-project
rm -rf .git && git init
```

### Step 2: Delete Example Content

The boilerplate ships with example content for a fictional NestJS project. Remove it so you start clean:

```bash
# Delete example pending requests (NestJS-specific — not relevant to your project)
rm agent-development/pending/1-docker-infrastructure.md
rm agent-development/pending/2-config-and-dotenv.md
rm agent-development/pending/3-makefile-and-dev-commands.md
```

> **Keep the `done/` examples.** The completed plan in `agent-development/done/plans/0-project-bootstrapping/` and its matching request in `agent-development/done/requests/` serve as reference for the level of detail that works well. They are useful regardless of your tech stack. You can delete them later once you have your own completed plans to reference.

### Step 3: Bootstrap Your Agent Specs (Use Prompt 0)

This is the critical step. The five files in `agent-development/agent-specs/` contain example content that you need to replace with your project's actual details.

1. Open a new agent conversation in your IDE (Cursor, Windsurf, Copilot, etc.).
2. Paste the contents of **`user-development/prompts/0-bootstrap-specs.md`**.
3. Replace `<PROJECT_DESCRIPTION>` with a description of your project — what it does, who it's for, what tech stack you're using, and any key architectural decisions.
4. If you have an existing codebase, point the agent at the source tree so it can read the code directly.
5. The agent generates all five `agent-specs/` files in one shot.
6. **Review the generated files.** The agent will flag anything it was unsure about. Pay special attention to `agent-instructions.md` — this is where your coding standards live, and you'll tweak it throughout the project's life.

The five spec files and what goes in each:

| File | What It Contains | How Often You Customize |
|---|---|---|
| `agent-instructions.md` | Coding standards, dos/don'ts, naming, testing, error handling | **Frequently** — evolves with your project |
| `agent-workflow.md` | Execution rules, blast radius, commit timing, spec/doc update rules | **Rarely** — system-level, only if you change the SDD process |
| `application-overview.md` | What the app does, core workflows, UX/DX goals | **Occasionally** — when scope or purpose shifts |
| `architecture-breakdown.md` | Directory tree, folder descriptions, design patterns, tech stack, module deps | **Per-task** — updated as part of spec updates |
| `git-workflow.md` | Branching strategy, commit message format, ticket ID pattern, versioning | **Once at setup** — then rarely |

### Step 4: Make Your First Commit

```bash
git add -A
git commit -m "chore: initialize SDD boilerplate with project specs"
```

This is your baseline. Everything from here on out goes through the pipeline.

### Step 5: Create Your First Task Request

Option A — write it yourself using `agent-development/pending/_TEMPLATE-request.md` as a guide.

Option B — paste the contents of `user-development/prompts/3-request-feature.md` into an agent conversation and describe what you want. The agent will create a properly formatted request file in `pending/`.

> **Tip:** A good first task is whatever foundational setup your project needs — project initialization, directory structure, Docker infrastructure, CI pipeline, etc. Look at the example completed plan in `done/plans/0-project-bootstrapping/` for inspiration.

### Step 6: Plan, Approve, Execute

Follow the pipeline:

```
 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │ REQUEST  │────▶│   PLAN   │────▶│ APPROVE  │────▶│ EXECUTE  │────▶│   DONE   │
 │ (human)  │     │ (agent)  │     │ (human)  │     │ (agent)  │     │ (auto)   │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                   creates a        reviews spec,     executes stages   plan folder &
                   plan folder       resolves Qs,      in order,         request archived
                   with stages       moves folder      updates manifest  in done/
```

1. **Plan:** Paste `user-development/prompts/1-plan-task.md` into an agent conversation. Point it at your pending request.
2. **Approve:** Review the `specification.md` in the generated plan folder. Resolve any open questions. Move the plan folder from `plans/` → `queued/`.
3. **Execute:** Paste `user-development/prompts/2-execute-plan.md` into a new agent conversation. Point it at the approved plan in `queued/`.

For the full workflow documentation, read `user-development/DEVELOPMENT-GUIDE.md`.

### Step 7: Read the Development Guide

Open `user-development/DEVELOPMENT-GUIDE.md` for the complete reference, including:

- The five-stage pipeline in detail
- How plans are structured as folders with a manifest, specification, and stage files
- How the open questions mechanism works
- How to use all the prompt templates
- The quick fix track for small changes
- File lifecycle and naming conventions

## Understand the Two Tracks

This boilerplate provides **two tracks** for getting work done:

| Track | When to Use | Prompt | Audit Trail |
|---|---|---|---|
| **Full Pipeline** | Features, refactors, anything with design decisions or touching 4+ files | `1-plan-task.md` → `2-execute-plan.md` | Request file + plan folder in `done/` |
| **Quick Fix** | Small, mechanically obvious changes (1–3 files, no ambiguity) | `4-quick-fix.md` | Log file in `done/quick-fixes/` |

The full pipeline is the default. Use the quick fix track only when a change is truly trivial — if the agent discovers it's bigger than expected, it will stop and recommend the full pipeline instead. See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#the-quick-fix-track) for details.

## What's Included as Examples

To help you understand the expected level of detail, this boilerplate includes:

### Example Agent Specs

The `agent-specs/` files contain example content for a fictional TypeScript/NestJS project (our organization's recommended backend stack). Each file has a prominent banner reminding you to replace it with your own content. Use Prompt 0 (`user-development/prompts/0-bootstrap-specs.md`) to generate your own — the examples are there to demonstrate the structure and level of detail, not to be used as-is.

The one exception is `agent-workflow.md`, which is **system-level** — it defines how agents interact with the SDD pipeline (execution rules, blast radius, commit timing, spec/doc update rules) and typically doesn't need customization regardless of your tech stack.

### Example Request & Plan (in `done/`)

- `agent-development/done/requests/0-project-bootstrapping.md` — shows what a well-structured task request looks like.
- `agent-development/done/plans/0-project-bootstrapping/` — shows what a complete plan folder looks like, including:
  - `manifest.json` — task metadata, 5 stages with context/output files and verification commands
  - `specification.md` — human-readable overview with resolved open questions and a 41-file manifest
  - `1-project-initialization.md` through `5-documentation-updates.md` — detailed stage instructions with blast radius constraints, step-by-step actions, and rollback plans
  - Separate spec updates (stage 4) and documentation updates (stage 5) — this is a multi-stage plan, so these are separate final stages

> **Keep these examples** after adopting the boilerplate. They serve as reference for how completed plans and requests should look, regardless of your project's tech stack. Delete them only once you have your own completed plans to reference.

### Example Pending Requests

Three pre-written task requests in `agent-development/pending/` demonstrate common early-project tasks related to local development infrastructure:

| Request | Purpose |
|---|---|
| `1-docker-infrastructure.md` | Dockerfiles, docker-compose with configurable ports, health checks |
| `2-config-and-dotenv.md` | Configuration module, `.env` management, startup validation |
| `3-makefile-and-dev-commands.md` | Makefile with grouped targets for every common dev operation |

These assume a TypeScript/NestJS stack. **Delete them during Step 2** of the Quick Start if they don't match your project. They serve as reference for the level of detail that produces the best results — the patterns (Docker, config, Makefile) apply broadly even if the specific tech differs.

## Adapting to Your Stack

This boilerplate is **language-agnostic** at the workflow level. The pipeline, templates, prompts, and directory structure work with any technology stack. The only files that reference a specific language are:

- `agent-development/agent-specs/agent-instructions.md`, `application-overview.md`, `architecture-breakdown.md` — replace with your project's details using Prompt 0
- `agent-development/pending/1-3-*.md` — the example pending requests assume TypeScript/NestJS

The example content uses TypeScript/NestJS because that is our organization's recommended backend stack (NestJS for backend, Next.js for frontend). Most of our projects are TypeScript-focused, though we occasionally use other languages. The workflow itself has been battle-tested with Go and TypeScript projects, and the same structure works for Python, Rust, Java, or any language where you want structured, human-supervised AI development.

### What to Keep vs. Replace

| File / Directory | Keep or Replace? | Notes |
|---|---|---|
| `agent-development/agent-specs/agent-workflow.md` | **Keep as-is** | System-level execution rules. Only change if you modify the SDD workflow itself. |
| `agent-development/agent-specs/agent-instructions.md` | **Replace content** | Your coding standards. The structure (headings, comment banners) is reusable; the rules are project-specific. |
| `agent-development/agent-specs/application-overview.md` | **Replace entirely** | Describes your app, not the example app. |
| `agent-development/agent-specs/architecture-breakdown.md` | **Replace entirely** | Your actual directory tree, modules, and patterns. |
| `agent-development/agent-specs/git-workflow.md` | **Tweak** | Defaults are sensible. Update ticket ID pattern, branch naming, and versioning strategy for your team. |
| `agent-development/plans/_templates/` | **Keep as-is** | Universal plan structure. |
| `agent-development/pending/_TEMPLATE-request.md` | **Keep as-is** | Universal request template. |
| `agent-development/pending/1-3-*.md` | **Delete** | NestJS-specific examples. |
| `agent-development/done/` examples | **Keep for reference** | Delete once you have your own completed plans. |
| `user-development/prompts/` | **Keep as-is** | Universal prompts. |
| `user-development/DEVELOPMENT-GUIDE.md` | **Keep as-is** | Workflow docs — not project-specific. |

### The Quick Fix Track

Not every change needs the full pipeline. The **quick fix track** (`user-development/prompts/4-quick-fix.md`) handles small, mechanically obvious changes — extracting a constant, renaming a route, updating a config value. The agent makes the change directly, runs verification, and logs the result as a dated file in `agent-development/done/quick-fixes/`. No plan folder, no approval gate, no request file. If the agent discovers the change is larger than expected, it stops and recommends the full pipeline. See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#the-quick-fix-track) for qualifying criteria and details.

### Git Workflow & Commits

All development happens on feature branches — never on `main`. Agents verify they're on a feature branch before making any changes and refuse to proceed if they're on `main`. Each completed stage of a plan gets its own [Conventional Commit](https://www.conventionalcommits.org/), so you can rollback individual stages via `git revert` or an entire feature by reverting the PR. If a ticket ID (e.g., `PROJ-123`) is detected in the branch name, agents automatically include it in every commit message. Agents do not bump version numbers — that's a release concern for the human or CI. See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#git-workflow--commits) for full details and `agent-development/agent-specs/git-workflow.md` for the spec agents follow.

## Key Concepts

### Plans Are Folders, Not Files

Each plan is a folder containing a `manifest.json` (authoritative task state), a `specification.md` (human-readable overview for approval), and numbered stage files with detailed implementation instructions. This structure allows large tasks to be broken into focused, independently verifiable stages while keeping small tasks truly lightweight (a single stage that includes everything). See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#plan-structure) for the full breakdown.

### The Open Questions Mechanism

When a planning agent encounters ambiguity — a naming choice, a trade-off, a missing requirement — it writes up the question in the plan's `specification.md` under the "Open Questions & Decisions" section instead of guessing. Each question includes options with trade-offs and a recommendation. The human resolves all questions before moving the plan folder to `queued/`. See the [Development Guide](user-development/DEVELOPMENT-GUIDE.md#the-open-questions-mechanism) for details.

### Blast Radius Constraints

Each stage file explicitly declares which files the implementing agent is allowed to read and write. Anything not listed is out of scope. This prevents agents from making unscoped changes and makes it clear exactly what each stage touches. See `agent-development/agent-specs/agent-workflow.md` for enforcement rules.

### Source Code Is the Source of Truth

Agents read the actual source code to understand the current state of the project. The spec files provide context and conventions, but if there's ever a conflict between a spec and what's in the code, the code wins (and the spec should be updated).

### Coding Standards vs. Workflow Rules

The agent-facing specs are split into two concerns:

- **`agent-instructions.md`** — *how to write code* for your project. Coding standards, dos/don'ts, naming, testing, error handling. You customize this frequently as your project evolves.
- **`agent-workflow.md`** — *how to interact with the SDD pipeline*. Execution rules, blast radius, commit timing, spec/doc update rules. This is system-level and rarely needs changes.

This separation means you can evolve your coding standards without touching the workflow rules, and vice versa.

### Spec & Doc Updates

Every plan must ensure that agent specs and human-facing documentation stay accurate after implementation. How this is structured depends on plan size:

- **Multi-stage plans (2+ implementation stages):** Spec and doc updates are **separate final stages** — a penultimate stage for spec updates and a final stage for documentation updates. Each gets its own commit. If no changes are needed, the stage is marked `skipped`.
- **Single-stage plans (1 implementation stage):** Spec and doc updates are **inline steps at the end of the single stage** — no separate stages, no extra commits. This keeps small plans lightweight: one stage, one commit.

In both cases, the check is never silently skipped — if no updates are needed, it must be explicitly stated. See `agent-development/agent-specs/agent-workflow.md` for the full rules.

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
A: No. Small tasks can have a single implementation stage with spec/doc updates included as inline steps at the end — one stage, one commit, no overhead. Multi-stage plans (2+ implementation stages) add spec and doc updates as separate final stages. All plans follow the same folder structure (manifest + specification + stage files) regardless of size.

**Q: What happens if execution is interrupted mid-plan?**
A: The `manifest.json` tracks `current_stage` and each stage's `status`. When you start a new agent conversation to resume, the agent reads the manifest, sees which stages are already `done`, and picks up from where it left off. See `agent-development/agent-specs/agent-workflow.md` for the full resumption protocol.

**Q: Should I commit the `done/` files?**
A: Yes. They serve as a project history and help future agents (and humans) understand why things were built the way they were.

**Q: Do agents handle git commits automatically?**
A: Yes. Agents commit after each plan stage passes verification (one commit per stage) and once for the entire quick fix. They use [Conventional Commits](https://www.conventionalcommits.org/) and automatically include ticket IDs extracted from the branch name. However, agents never create branches, merge to `main`, or bump version numbers — those are human/CI responsibilities.

**Q: What's the difference between `agent-instructions.md` and `agent-workflow.md`?**
A: `agent-instructions.md` contains your **coding standards** — how to write code for your specific project (naming, testing, error handling, framework rules). You customize it frequently. `agent-workflow.md` contains the **SDD execution rules** — how agents interact with plans, stages, blast radius, and commits. It's system-level and rarely needs changes unless you're modifying the SDD workflow itself.

## License

MIT — use this however you like.