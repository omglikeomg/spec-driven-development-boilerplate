# Git Workflow & Commit Conventions

<!-- 
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  THIS IS A STARTING POINT — Tweak these conventions to fit your project    ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
  
  This file defines the branching strategy, commit conventions, and versioning
  expectations for agent-driven development. Agents read this file before
  making any commits.
  
  Areas you'll almost certainly want to tweak:
  - The "Ticket ID Pattern" section (match your issue tracker)
  - The "Branch Naming" section (match your team's conventions)
  - The "Versioning Expectations" section (match your release strategy)
-->

## Core Principle

All development happens on **feature branches**, never on `main`. Every branch results in a Pull Request (PR) that is reviewed before merging. This gives humans a final review gate and provides an easy rollback mechanism — revert the PR if something goes wrong.

---

## Branch Naming

The human creates the branch before starting an agent conversation. Agents do **not** create branches — they work on whatever branch is currently checked out.

### Expected Format

Format will be one of the following:

- `<type>/<ticket-id>-<short-description>`
- `<type>/<ticket-id>_<short-description>`
- `<type>/<ticket-id>/<short-description>`

**Examples:**
- `feat/PROJ-123-add-user-preferences`
- `fix/PROJ-456_correct-pagination-offset`
- `chore/PROJ-789/update-dependencies`
- `feat/add-user-preferences` (no ticket — also valid, but should be alerted to user)

### Branch Type Prefixes

| Prefix | When to Use |
|---|---|
| `feat/` | New features, new endpoints, new modules |
| `fix/` | Bug fixes, corrections to existing behavior |
| `chore/` | Dependency updates, config changes, tooling |
| `refactor/` | Code restructuring with no behavior change |
| `docs/` | Documentation-only changes |

### Ticket ID

The ticket ID is **optional** but recommended. If present in the branch name, agents must include it in every commit message (see [Commit Message Format](#commit-message-format) below).

Agents detect ticket IDs by scanning the branch name for a pattern matching:

```
[A-Z][A-Z0-9]+-\d+
```

<!-- 
  👆 TWEAK THIS: This regex matches common formats like PROJ-123, JIRA-4567,
  ABC-1. If your tracker uses a different format (e.g., GitHub issue numbers
  like #123, or Linear identifiers like ENG-123), update the pattern and
  examples accordingly.
-->

**Examples of detected ticket IDs:** `PROJ-123`, `SDD-42`, `API-7890`

If no ticket ID is detected, the agent omits it from commit messages — this is fine.

---

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) (v1.0.0). Every commit message must follow the format below.

### Commit Message Format

```
<type>(<optional-scope>): <ticket-id> <description>
```

- **`type`** — one of the types listed below (required)
- **`scope`** — the module, feature, or area affected (optional but encouraged)
- **`ticket-id`** — extracted from the branch name if present (see above)
- **`description`** — a short, imperative-mood summary of what the commit does

**With ticket ID:**
```
feat(books): PROJ-123 add pagination to list endpoint
fix(config): PROJ-456 correct default Redis port
```

**Without ticket ID:**
```
feat(books): add pagination to list endpoint
chore: update TypeScript to 5.5
```

### Commit Types

| Type | When to Use | Versioning Signal |
|---|---|---|
| `feat` | A new feature or capability | MINOR |
| `fix` | A bug fix or correction | PATCH |
| `refactor` | Code change that doesn't fix a bug or add a feature | — |
| `test` | Adding or updating tests only | — |
| `docs` | Documentation-only changes | — |
| `style` | Formatting, whitespace, semicolons — no logic changes | — |
| `chore` | Build process, dependency updates, tooling | — |
| `build` | Changes to build system or external dependencies | — |
| `ci` | Changes to CI configuration or scripts | — |
| `perf` | Performance improvements with no functional change | PATCH |

### Breaking Changes

If a commit introduces a breaking change (public API change, database schema migration that isn't backward-compatible, removed endpoints, etc.), add `BREAKING CHANGE:` in the commit body or use `!` after the type:

```
feat(api)!: PROJ-999 replace REST endpoints with GraphQL

BREAKING CHANGE: All /api/v1/* REST endpoints have been removed.
Clients must migrate to the /graphql endpoint.
```

Breaking changes signal a MAJOR version bump.

### Rules for Agents

1. **Choose the commit type based on what the change actually does** — not based on whether it's a plan or a quick fix. A quick fix that corrects a bug is `fix`. A quick fix that extracts a constant is `refactor`. A plan stage that adds a new feature is `feat`.
2. **Keep commits atomic** — each commit should represent one logical unit of work. For plans, this means one commit per stage. For quick fixes, this means one commit for the entire fix.
3. **Write the description in imperative mood** — "add pagination" not "added pagination" or "adds pagination."
4. **Keep the first line under 72 characters** — longer explanations go in the commit body.
5. **Include the ticket ID if one is detected in the branch name** — never fabricate a ticket ID.

---

## When to Commit

### During Plan Execution

Commit **once per stage**, after the stage's verification checks pass. The sequence is:

1. Implement the stage's instructions.
2. Run all verification checks from the stage's "Verification" section.
3. If checks pass → update `manifest.json` (stage status to `done`, increment `current_stage`).
4. **Commit all changes from this stage** (including the `manifest.json` update).
5. Move on to the next stage.

If verification fails and the agent fixes the issue, the fix is included in the same commit — there should be exactly **one commit per completed stage**.

**Example commit sequence for a 4-stage plan on branch `feat/PROJ-123-add-user-preferences`:**

```
feat(config): PROJ-123 add user preferences schema and migration
feat(users): PROJ-123 add preferences service and controller
docs(specs): PROJ-123 update agent-specs with preferences module
docs: PROJ-123 update README with preferences configuration
```

### During Quick Fixes

Commit **once**, after verification passes and the quick fix log file has been created. The commit includes all source changes, any spec/doc updates, and the log file.

**Example commit on branch `fix/PROJ-456-correct-pagination-offset`:**

```
fix(books): PROJ-456 correct off-by-one error in pagination offset
```

### After Plan Completion (File Moves)

The final housekeeping step of plan execution — moving the plan folder to `done/plans/` and the request to `done/requests/` — should be a **separate commit** from the last stage:

```
chore: PROJ-123 archive completed plan and request
```

This keeps the archive move cleanly separable from the actual implementation.

---

## Versioning Expectations

<!--
  👆 TWEAK THIS: This section documents how your project handles versioning.
  The guidance below is intentionally kept as expectations rather than rules
  because version bumps are typically a human/CI concern, not something agents
  should do automatically.
  
  If your project uses a specific tool for versioning (e.g., standard-version,
  semantic-release, changesets), document it here so agents know not to manually
  edit version files.
-->

Agents do **not** bump version numbers or edit version files. Versioning is handled by the human or by CI tooling when the PR is merged. However, agents should be aware of the versioning *expectations* so they can choose appropriate commit types:

| Change Type | Expected Version Impact | Examples |
|---|---|---|
| Quick fixes | **PATCH** (0.0.x) | Bug fix, typo correction, config value update |
| Plan execution (typical) | **MINOR** (0.x.0) | New feature, new endpoint, new module |
| Plan execution (breaking) | **MAJOR** (x.0.0) | Removed endpoint, schema migration without backward compat, API contract change |

If a plan introduces a breaking change, the planning agent should note this in the `specification.md` and the relevant stage's commit should use the `!` suffix or `BREAKING CHANGE:` footer as described above. This ensures that automated versioning tools (if configured) can detect the bump correctly.

---

## Pre-Flight Checks for Agents

Before making any commit, the agent must verify:

1. **You are NOT on `main`** — if the current branch is `main`, **STOP** and ask the human to create a feature branch first. Never commit directly to `main`.
2. **The branch name is readable** — run `git branch --show-current` to read the current branch name. Extract the ticket ID if present.
3. **Verification passed** — never commit code that fails its verification checks.
4. **Only scoped files are included** — for plan stages, only files within the stage's blast radius should be in the commit. Run `git status` to confirm there are no unexpected changes.

---

## Summary

| Situation | Branch | Commits | Commit Type |
|---|---|---|---|
| Plan execution | Feature branch created by human | One per stage + one for archive moves | Based on stage content (`feat`, `fix`, `test`, `docs`, etc.) |
| Quick fix | Feature branch created by human | One for the entire fix | Based on change content (`fix`, `refactor`, `style`, etc.) |
| Archive moves (post-plan) | Same feature branch | One separate commit | `chore` |
