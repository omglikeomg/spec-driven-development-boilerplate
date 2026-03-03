# Stage [N]: [Stage Name]

**Plan:** `[plan-directory-name]`
**Status:** todo | in-progress | done | skipped | failed
**Last Updated:** YYYY-MM-DD

---

## Objective

<!-- One-paragraph description of what this stage accomplishes and why it exists as a discrete unit of work. -->

---

## Resource Constraints (Blast Radius)

> Only the following files/directories may be accessed or modified during this stage. If a dependency on an unlisted file is discovered mid-stage, **stop and update the manifest** before proceeding.

### Allowed Read Access

| Path | Reason |
|---|---|
| `path/to/file-or-directory` | Why this file needs to be read |

### Allowed Write Access

| Path | Reason |
|---|---|
| `path/to/file-or-directory` | Why this file needs to be created/modified |

### Forbidden

- Any file or directory not listed above is **out of scope** for this stage.
- If a dependency on an unlisted file is discovered, **stop and update the manifest and this stage file** before proceeding.

---

## Prerequisites

- [ ] Stage [N-1] is marked `done` in `manifest.json`
- [ ] Any other prerequisite condition

---

## Instructions

### Step [N].1: [Step Description]

**File:** `path/to/file.ts`
**Action:** create | modify | delete

<!-- Detailed instruction for what to do, including code snippets where applicable. Be specific — the implementing agent should not need to make judgment calls here. -->

---

### Step [N].2: [Step Description]

**File:** `path/to/file.ts`
**Action:** create | modify | delete

<!-- Detailed instruction... -->

---

<!-- Repeat for as many steps as needed. Each step should be atomic — one file, one clear action. -->

---

<!--
  ═══════════════════════════════════════════════════════════════════════════════
  SINGLE-STAGE PLANS ONLY — Inline Spec & Doc Updates

  If this is the only stage in the plan, add the following steps at the end
  of the Instructions section (renumber to fit). These replace the separate
  spec-updates and documentation-updates stages that multi-stage plans use.

  Delete this comment block for multi-stage plans — those have separate stages.
  ═══════════════════════════════════════════════════════════════════════════════
-->

### Step [N].X: Update spec files (if needed)

**Action:** review and update (or confirm no changes needed)

Review the following files and update them if this stage introduced any architectural, structural, or convention changes:

- `agent-development/agent-specs/architecture-breakdown.md` — new directories, modules, dependency changes, tech stack updates
- `agent-development/agent-specs/agent-instructions.md` — new coding standards or dos/don'ts discovered during implementation

If no changes are needed, note "Reviewed — no spec updates required" and move on.

---

### Step [N].Y: Update documentation (if needed)

**Action:** review and update (or confirm no changes needed)

Review the following files and update them if this stage introduced any user-facing changes:

- `README.md` — new features, configuration options, setup steps
- Any other project-specific documentation

If no changes are needed, note "Reviewed — no documentation updates required" and move on.

---

## Verification

### Automated Checks

| Command | Expected Result |
|---|---|
| `yarn build` | Exit code 0, no type errors |
| `yarn test --filter [scope]` | All tests pass |

### Manual Verification

- [ ] Verifiable criterion (e.g., "New file follows naming conventions from agent-instructions.md")
- [ ] Another criterion

### Artifacts

- [ ] All output files listed in the manifest for this stage exist and are non-empty
- [ ] No modifications were made outside the blast radius

---

## Commit

After all verification checks pass and `manifest.json` has been updated for this stage:

1. Stage all changes from this stage (including the `manifest.json` update).
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) format.
3. Choose the commit type based on what this stage actually does (`feat`, `fix`, `test`, `docs`, `refactor`, etc.).
4. Include the ticket ID if one was detected in the branch name.
5. See `agent-development/agent-specs/git-workflow.md` for the full commit message format.

**Suggested commit message:**
<!-- The planning agent should fill this in with a recommended commit message for this stage. Example: -->
```
<type>(<scope>): <ticket-id> <description>
```

---

## Rollback Plan

If this stage fails or must be reverted:

1. Specific step to undo changes (e.g., "Delete `path/to/new-file.ts`")
2. Specific step (e.g., "Revert `path/to/existing-file.ts` via `git checkout`" or `git revert <commit>`)
3. Set this stage's `status` to `failed` in `manifest.json`

---

## Notes

<!-- Any additional context, gotchas, edge cases, or architectural decisions relevant to this stage. Remove this section if empty. -->