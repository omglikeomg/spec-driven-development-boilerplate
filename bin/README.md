# bin/dev — SDD Agent CLI Helper

A portable CLI wrapper for all agent-facing operations in projects using the SDD boilerplate.

> **Full adoption guide:** For the complete bootstrapping flow (including when to run `bootstrap.sh`, how to configure `commands.yaml` and `teams.yaml`, and how `bin/dev` fits into the broader SDD adoption sequence), see [ADOPTION.md](../ADOPTION.md).

## Scope: Local vs Git-Native Mode

`bin/dev` serves different roles depending on the workflow mode:

| Mode | Who uses `bin/dev` | Purpose |
|------|-------------------|----------|
| **Local mode** | IDE-based agents + humans | Primary interface for ALL operations |
| **Git-native mode** | Humans only (hub operator) | Setup, verification, and status monitoring |

In git-native mode, **Copilot Cloud Agent does NOT use `bin/dev`**. Instead:
- Its environment is configured by `copilot-setup-steps.yml`
- It reads `.github/copilot-instructions.md` for build commands
- It runs `pnpm test`, `pnpm lint`, etc. directly
- GitHub Actions handles orchestration

`bin/dev` remains the human's tool for managing the hub, setting up repos, and checking pipeline status.

## Quick Start

```bash
# See all commands
bin/dev help

# Fast verification (scoped to changed files)
bin/dev verify

# Full verification (build + lint + typecheck + test)
bin/dev verify:full

# Create a branch
bin/dev branch feat PROJ-123 add-vendor-filters

# Open a draft PR
bin/dev pr:draft "feat(vendor): PROJ-123 add vendor filters"

# Check workflow status
bin/dev wf:status

# What should I work on next?
bin/dev wf:next

# Any blockers or open questions?
bin/dev wf:blockers

# Get a structured review packet for a PR
bin/dev review 109

# Record a note
bin/dev note --type=discovery "VendorService silently returns null on missing"
```

## Architecture

```
sdd/bin/
├── dev                   ← Main entry point (dispatcher)
├── README.md             ← This file
├── bootstrap.sh          ← One-command setup for new projects
├── commands/             ← Individual command scripts
│   ├── _common.sh        ← Shared utilities (logging, config, git helpers)
│   ├── build.sh
│   ├── lint.sh
│   ├── lint-fix.sh
│   ├── typecheck.sh
│   ├── test.sh
│   ├── test-cov.sh
│   ├── verify.sh         ← Smart: detects changed files, runs relevant checks
│   ├── verify-full.sh
│   ├── branch.sh
│   ├── branch-check.sh
│   ├── pr-draft.sh
│   ├── pr-ready.sh
│   ├── pr-status.sh
│   ├── wf-status.sh
│   ├── wf-validate.sh
│   ├── wf-next.sh          ← Show next approved plan(s) ready to execute
│   ├── wf-blockers.sh      ← List open questions and pending amendments
│   ├── wf-archive.sh       ← Archive completed epic to done/
│   ├── review.sh           ← Structured PR review packet
│   ├── note.sh
│   ├── note-read.sh
│   ├── note-clear.sh
│   ├── repo-setup-gitflow.sh ← Set up git-native SDD in a target repo
│   ├── gitflow-labels.sh  ← Create required GitHub labels
│   ├── gitflow-status.sh  ← Pipeline status via GitHub API
│   └── gitflow-verify.sh  ← Verify git-native setup completeness
└── hooks/                ← Git hook scripts
    ├── pre-commit        ← Validates SDD manifests
    └── commit-msg        ← Validates conventional commit format
```

## Configuration

### `sdd/config/commands.yaml`

Maps abstract command names to your project's actual commands:

```yaml
package_manager: pnpm
commands:
  build: "pnpm run build"
  lint: "pnpm lint-nofix"
  typecheck: "pnpm tscheck"
  test: "pnpm test"
```

This is the **only file** you need to edit to adopt `bin/dev` in a new project.

### `sdd/config/teams.yaml`

Team-level settings for branching, Jira integration, and conventions. Used by git flow commands.

## Adding New Commands (Growth Protocol)

1. Create a new script in `sdd/bin/commands/<command-name>.sh`
2. The script is automatically available as `bin/dev <command-name>`
3. Use `:` in command names → maps to `-` in filenames (e.g., `pr:draft` → `pr-draft.sh`)
4. Source `_common.sh` utilities by using the functions directly (they're pre-loaded)
5. Follow the existing scripts as examples
6. Update this README with the new command

### Command Script Template

```bash
#!/usr/bin/env bash
# bin/dev <command> — Brief description
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Your command logic here
# Available utilities: log_info, log_success, log_warn, log_error, log_step
# Config helpers: get_command, get_branching_config, get_base_branch
# Git helpers: get_current_branch, get_ticket_from_branch, is_on_base_branch
```

## Agent Notes Protocol

Agents record discoveries and suggestions during work:

```bash
bin/dev note "The config module doesn't export its types"
bin/dev note --type=suggestion "Need a command to reset test DB"
bin/dev note --type=friction "Had to read 5 files to find the service registration"
```

**Types:**
- `discovery` (default) — undocumented behavior or pattern
- `suggestion` — a tool, command, or improvement idea
- `friction` — something that slowed work down
- `question` — something that couldn't be determined from docs

Notes are committed (in `sdd/.agent-notes`) and reviewed by humans on cadence. Use `bin/dev note:clear` to archive when stale.

## Git Hooks

### Installation with Lefthook

Add to your `lefthook.yml`:

```yaml
pre-commit:
  commands:
    validate-sdd:
      glob: "sdd/**/*.{yaml,yml,md}"
      run: bash sdd/bin/hooks/pre-commit

commit-msg:
  commands:
    conventional-commit:
      run: bash sdd/bin/hooks/commit-msg {1}
```

### Installation with Husky

```bash
npx husky add .husky/pre-commit "bash sdd/bin/hooks/pre-commit"
npx husky add .husky/commit-msg "bash sdd/bin/hooks/commit-msg $1"
```

## Audit Log

Every `bin/dev` invocation is logged to `sdd/.agent-audit-log` (gitignored). This is for debugging the current session — not a permanent record.

Format: `[timestamp] [exit:code] bin/dev command args`

## Prerequisites

- Bash 4+ (macOS: `brew install bash`)
- Git
- GitHub CLI (`gh`) — for PR commands
- Your project's package manager (npm/pnpm/yarn/bun)
