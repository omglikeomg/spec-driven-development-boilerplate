# Spec-Driven Development — Multirepo Hub

A coordination hub for managing cross-repo epics using the Spec-Driven Development (SDD) methodology. This template is designed for microservices architectures where features frequently span multiple repositories.

## What Is This?

This is a **scaffolding template**. You clone it, delete the `.git` folder, and start a new repo tailored to your specific domain (e.g., "Marketplace Hub", "Couples Zone Hub", "Data Platform Hub").

Once scaffolded, the hub:
- Coordinates planning across 2–10+ repositories
- Tracks cross-repo epics, task graphs, and delivery manifests
- Provides fallback SDD structures for repos that haven't adopted SDD internally
- Manages git submodules for each target repo (agent-operated only)
- Never gets deployed — it's a local development and planning tool

## Quick Start

### Step 1: Scaffold Your Hub

```bash
git clone <this-repo-url> my-domain-hub
cd my-domain-hub
rm -rf .git
git init
```

### Step 2: Register Your Repos

Edit `config/repos.yaml` — replace the examples with your actual repos:

```yaml
repositories:
  my-api:
    display_name: "My API"
    git_url: "git@github.com:org/my-api.git"
    # ... (see config/repos.yaml for full schema)
```

### Step 3: Add Submodules

```bash
bin/dev repo:add my-api git@github.com:org/my-api.git
bin/dev repo:add my-frontend git@github.com:org/my-frontend.git
```

### Step 4: Bootstrap Agent Context

Start a conversation with your AI coding agent and use Prompt 0 (`user-development/prompts/0-bootstrap-hub.md`). Provide:
- Which repos are in scope
- How they connect (API calls, queues, shared DBs)
- Tech stack per repo
- Team conventions (Jira project, branch naming)

The agent will generate:
- `architectural-schemas/system-overview.md`
- `documentation/<repo>/overview.md` (for each repo)
- `fallback-sdd/<repo>/agent-specs/` (for repos without their own SDD)
- Updated `config/teams.yaml`

### Step 5: Delete Example Content

Remove the example entries from `config/repos.yaml` and any placeholder files.

### Step 6: First Commit

```bash
git add .
git commit -m "chore: scaffold multirepo hub for <domain-name>"
```

### Step 7: Start Planning

Use Prompt 5 (`5-create-epic.md`) to define your first cross-repo epic.

## Day-to-day developer flow

1. Keep repo-specific behavior in `bin/workflow-scripts/` or `bin/sync-state/`.
2. Keep GitHub Actions YAML thin — it should wire inputs, not hold business logic.
3. Use `docs/WORKFLOW-REFERENCE.md` when you need lifecycle or recovery details.
4. Use `docs/BEST-PRACTICES.md` when deciding whether code belongs in YAML or a module.
5. Use `docs/FIRST-TIME-SETUP.md` when you need the exact `gh` commands for secrets and variables.

## Repository Structure

```
hub/
├── config/
│   ├── repos.yaml                 ← Registry of all managed repos
│   └── teams.yaml                 ← Jira, branching, team conventions
│
├── epics/                         ← Cross-repo epic planning
│   ├── _templates/                ← Templates for epic artifacts
│   ├── active/                    ← Epics currently in progress
│   └── done/                      ← Archived completed epics
│
├── repos/                         ← Git submodules (agent-managed only)
│
├── fallback-sdd/                  ← SDD for repos without their own
│   └── <repo-name>/              ← Mirrors what sdd/ would look like in the repo
│
├── common-specs/                  ← Universal conventions
│   ├── git-workflow.md
│   ├── pr-conventions.md
│   └── sdd-process.md
│
├── documentation/                 ← Per-repo architecture docs (fallback)
├── contracts/                     ← Cross-service interface specs
├── architectural-schemas/         ← System topology diagrams
│
├── bin/dev                        ← Hub CLI (coordination commands)
├── bin/workflow-scripts/          ← Thin workflow adapters + shared helpers
├── user-development/              ← Prompts and human guides
│
├── AGENTS.md                      ← Rules for AI coding agents
└── ADOPTION.md                    ← How to add repos to an existing hub
```

## Key Concepts

### The Fallback Pattern

For any SDD resource, the resolution is:

```
Does repos/<name>/sdd/ exist?
├── YES → Use it (repo is self-sufficient)
└── NO  → Use fallback-sdd/<name>/ (hub provides structure)
```

### The Spec Resolution Cascade

When an agent needs context:

1. **Task plan** (specific instructions, blast radius)
2. **Repo-level specs** (repo's own `sdd/` or hub's `fallback-sdd/`)
3. **Hub documentation** (`documentation/`, `contracts/`, `architectural-schemas/`)
4. **Common specs** (`common-specs/` — universal conventions)

### DX rule of thumb

- If a GitHub Actions step contains real branching, parsing, or validation, move it into `bin/workflow-scripts/` and keep the workflow step as a wrapper.
- If the logic is reused outside workflows, move it into `bin/sync-state/` and add/extend tests.

### The Sync Rule

After completing a task, the agent updates BOTH:
- The local plan status (in the target repo)
- The hub's task-graph and delivery manifest (coordination state)

### One Epic Per Developer

Multiple epics can be active simultaneously, but each developer focuses on one at a time.

## Commands

Hub-level commands (coordination):

| Command | Purpose |
|---------|---------|
| `bin/dev repo:list` | Show all repos with status |
| `bin/dev repo:sync [name]` | Update submodules |
| `bin/dev repo:add <name> <url>` | Register new repo |
| `bin/dev repo:migrate <name>` | Move fallback-sdd into repo |
| `bin/dev dispatch <epic> <task>` | Dispatch task to target repo |
| `bin/dev status` | Cross-repo status dashboard |
| `bin/dev wf:next` | Next actionable task |
| `bin/dev resolve-spec <type> <repo>` | Find spec via cascade |

Run `bin/dev help` for the full catalog.

## SDD Methodology

This hub builds on the Spec-Driven Development methodology:
- **`main` branch** — Single-repo, plan-level workflow
- **`with-epics` branch** — Adds epic planning layer
- **`multirepo` branch** (this) — Extends to cross-repo coordination

For the full methodology reference, see `user-development/DEVELOPMENT-GUIDE.md`.

## License

MIT
