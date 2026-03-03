# Stage 4: Spec Updates

**Plan:** `0-project-bootstrapping`
**Status:** done
**Last Updated:** 2025-01-15

---

## Objective

Update the `agent-development/agent-specs/` files to accurately reflect the project state after Stages 1–3. This ensures that future agent conversations have correct context about the installed dependencies, module structure, folder layout, and any conventions established during bootstrapping.

This is the mandatory penultimate stage. Every plan must include a spec update stage — even if the conclusion is "no changes needed" (in which case the stage is marked `skipped` with a justification).

---

## Resource Constraints (Blast Radius)

> Only the following files/directories may be accessed or modified during this stage.

### Allowed Read Access

| Path | Reason |
|---|---|
| `package.json` | Verify installed dependencies match what specs claim |
| `src/app.module.ts` | Verify module imports match architecture breakdown |
| `src/**/*.module.ts` | Confirm all modules exist and are wired correctly |
| `docker/docker-compose.yml` | Verify infrastructure services match spec descriptions |
| `Makefile` | Verify dev workflow commands match spec descriptions |
| `tsconfig.json` | Verify compiler settings match spec claims |
| `agent-development/agent-specs/architecture-breakdown.md` | Current state — to be updated (includes directory tree, folder descriptions, module deps, conventions) |
| `agent-development/agent-specs/agent-instructions.md` | Current state — review for accuracy |
| `agent-development/agent-specs/application-overview.md` | Current state — review for accuracy |

### Allowed Write Access

| Path | Reason |
|---|---|
| `agent-development/agent-specs/architecture-breakdown.md` | Sync with actual installed deps, module wiring, patterns, and directory tree created in Stages 2–3 |
| `agent-development/agent-specs/agent-instructions.md` | Add or correct any conventions established during bootstrapping |

### Forbidden

- Any file or directory not listed above is **out of scope** for this stage.
- Do NOT modify any source code, Docker files, or config files — those were finalized in earlier stages.
- Do NOT modify `application-overview.md` unless the bootstrapping process revealed that the overview is factually wrong (unlikely for a bootstrapping task).

---

## Prerequisites

- [ ] Stage 3 is marked `done` in `manifest.json`
- [ ] All source files, Docker files, and config files are in their final state

---

## Instructions

### Step 4.1: Audit `architecture-breakdown.md` against reality

**File:** `agent-development/agent-specs/architecture-breakdown.md`
**Action:** modify

Read through the architecture breakdown and compare each section against the actual project state:

1. **Folder Structure section:** Verify every path description matches what was actually created. Check that module responsibilities are accurately described. If any module was added, renamed, or structured differently than the spec anticipated, update the description.

2. **Design Patterns section:** Confirm that the patterns listed (modular architecture, repository pattern, DTO validation, BullMQ, env config) are actually in use. For bootstrapping, most patterns are established but not yet fully implemented — note which ones are scaffolded vs. fully operational.

3. **Technology Stack table:** Cross-reference against `package.json`. Verify version ranges and library names are correct. If any dependency was substituted during implementation, update the table.

4. **Key Architectural Decisions section:** Add any decisions that were made during bootstrapping (e.g., from resolved open questions) that aren't already captured.

---

### Step 4.2: Audit directory tree in `architecture-breakdown.md` against reality

**File:** `agent-development/agent-specs/architecture-breakdown.md`
**Action:** modify

Run `find src -type f | sort` and `find docker -type f | sort` to get the actual file tree. Compare it against the directory tree in `architecture-breakdown.md`.

1. **Project Root tree:** Update to match reality. Add any files that were created but not in the original spec (e.g., `.dockerignore`). Remove any files that were planned but not created.

2. **Module Dependency Graph:** Verify by reading `src/app.module.ts` and each feature module's imports. Update if the actual import graph differs from what was documented.

3. **Key Conventions table:** Add any new conventions established during bootstrapping (e.g., "Docker files live in `docker/` subdirectory, accessed via Makefile").

4. **Update the "Last updated" line** at the top of the file to reference this task.

---

### Step 4.3: Review `agent-instructions.md` for accuracy

**File:** `agent-development/agent-specs/agent-instructions.md`
**Action:** modify (if needed)

Scan the agent instructions for any claims that conflict with what was actually set up:

1. **Workflow section:** Verify that the build/test commands listed (`yarn build`, `yarn test`) are correct.
2. **Docker & Local Development section:** Verify the Makefile targets and `.env` workflow described are accurate.
3. **If no changes are needed**, do not modify the file. Note in the verification section that the file was reviewed and found accurate.

---

## Verification

### Automated Checks

| Command | Expected Result |
|---|---|
| `grep -c 'Directory Tree' agent-development/agent-specs/architecture-breakdown.md` | At least 1 match (directory tree section exists) |

### Manual Verification

- [ ] `architecture-breakdown.md` — every package listed in the Technology Stack table exists in `package.json`
- [ ] `architecture-breakdown.md` — every module path in the Folder Structure section exists on disk
- [ ] `architecture-breakdown.md` — the directory tree matches the output of `find src -type f | sort` (no missing or extra entries)
- [ ] `architecture-breakdown.md` — the module dependency graph matches the actual imports in `src/app.module.ts` and feature modules
- [ ] `architecture-breakdown.md` — "Last updated" line references Task 0
- [ ] `agent-instructions.md` — build/test commands are correct (or file was reviewed and no changes needed)
- [ ] No spec file contains stale references to packages, modules, or patterns that don't exist in the codebase

### Artifacts

- [ ] All output files listed in the manifest for this stage exist and are non-empty
- [ ] No modifications were made outside the blast radius

---

## Rollback Plan

If this stage fails or must be reverted:

1. Revert `agent-development/agent-specs/architecture-breakdown.md` via `git checkout`
2. (No separate folder structure file to revert — directory tree is now part of `architecture-breakdown.md`)
3. Revert `agent-development/agent-specs/agent-instructions.md` via `git checkout` (if modified)
4. Set this stage's `status` to `failed` in `manifest.json`

---

## Notes

- This is a mandatory stage. Even when bootstrapping from templates that were already well-specified, the spec files should be verified against reality. Small drift is common — a renamed directory, a dependency version bump, an extra utility file — and catching it now prevents confusion in every future agent conversation.
- The standard for this stage is **accuracy, not exhaustiveness**. Don't rewrite the specs from scratch. Read the current content, compare it to what actually exists, and make targeted corrections.
- If a spec file is already accurate, note that in the verification checklist and move on. Don't make changes for the sake of making changes.