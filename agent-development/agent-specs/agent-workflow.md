# Agent Workflow & Execution Rules

<!-- 
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  THIS IS SYSTEM-LEVEL — You typically do NOT need to customize this file   ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
  
  This file defines how agents interact with the SDD pipeline: how to read
  plans, execute stages, respect blast radius constraints, commit work, and
  update specs/docs. These rules are workflow-level and apply regardless of
  your tech stack or coding standards.
  
  The coding standards, dos/don'ts, naming conventions, and stack-specific
  rules live in agent-instructions.md — that file is the one you'll customize
  heavily. This file should rarely need changes unless you're modifying the
  SDD workflow itself.
-->

## Workflow

These steps apply to every plan execution, regardless of size:

1. **Verify your branch** — run `git branch --show-current` to confirm you are on a feature branch (not `main`). Extract the ticket ID from the branch name if present. See `agent-development/agent-specs/git-workflow.md` for branch naming conventions and ticket ID detection.
2. Read the provided plan folder — start with `manifest.json` for task state and stage overview, then `specification.md` for the full context and resolved open questions.
3. For each stage, read the stage's instruction file (e.g., `1-stage-name.md`) and the source code files listed in its "Allowed Read Access" section. Use `agent-development/agent-specs/architecture-breakdown.md` for quick orientation if needed.
4. Implement the logic, respecting the stage's blast radius — only modify files listed in "Allowed Write Access."
5. Run the verification commands listed in the stage's "Verification" section.
6. After each stage passes, update `manifest.json`: set the stage's `status` to `done` and increment `current_stage`.
7. **Commit the stage** — commit all changes from this stage (including the `manifest.json` update) using a conventional commit message. See `agent-development/agent-specs/git-workflow.md` for the commit message format.
8. **Spec and doc updates** — every plan must include spec and doc updates. How they are structured depends on plan size (see [Spec & Doc Updates](#spec--doc-updates) below). Do not skip these unless the plan explicitly states no changes are needed.
9. After all stages are complete, **perform archive file moves** and make a **separate commit**: `chore: <ticket-id> archive completed plan and request`. See [Post-Completion](#post-completion) for details.

## Source Code Is the Source of Truth

The source files in the project are the canonical reference for how the system works. When working on a task:

1. **Read the source code directly** for the modules and files relevant to your current stage. The code should be well-structured and self-documenting.
2. **Use `agent-development/agent-specs/architecture-breakdown.md`** for quick orientation on project layout if you're unfamiliar with the directory structure.
3. **Respect the blast radius** — each stage file explicitly lists which files you may read and write. If you discover a dependency on an unlisted file, stop and update the manifest and stage file before proceeding.
4. **Do not update spec files or documentation mid-plan** unless the current stage's instructions explicitly include it (as they will for single-stage plans with inline spec/doc steps).

## Blast Radius Enforcement

Every stage file declares an explicit set of files the agent is allowed to read and write. This is the stage's **blast radius**.

- **Allowed Read Access** — files the agent may read to gather context for the stage.
- **Allowed Write Access** — files the agent may create or modify during the stage.
- **Forbidden** — everything else. If a file is not listed, it is out of scope.

If you discover mid-stage that you need to read or modify a file not in the blast radius:

1. **Stop implementation.**
2. Update the stage's instruction file to add the file to the appropriate access list with a reason.
3. Update `manifest.json` to reflect the new context or output file.
4. Then proceed with the implementation.

Never silently access files outside the blast radius.

## Spec & Doc Updates

Every plan must ensure that `agent-development/agent-specs/` files and human-facing documentation (`README.md`, etc.) stay accurate after implementation. **How** this is structured depends on plan size:

### Multi-Stage Plans (2+ Implementation Stages)

Spec and doc updates are **separate final stages**:

- **Penultimate stage — Spec Updates:** Update `agent-development/agent-specs/` files to reflect any architectural, structural, or convention changes introduced by the plan.
- **Final stage — Documentation Updates:** Update human-facing documentation (`README.md`, `DEVELOPMENT-GUIDE.md`, etc.) to reflect changes introduced by the plan.

Each gets its own stage file, its own blast radius, its own verification, and its own commit. If no changes are needed for a given stage, mark it `skipped` with a brief justification in the manifest.

### Single-Stage Plans (1 Implementation Stage)

Spec and doc updates are **inline steps at the end of the single stage** — not separate stages. The stage's instruction file should include final steps like:

- "Step N.X: Update spec files (if needed)"
- "Step N.Y: Update documentation (if needed)"

The stage's blast radius must include the spec and doc files that may need updating. Everything — implementation, spec updates, doc updates — is verified and committed together as **one stage, one commit**.

If no spec or doc updates are needed, the inline steps should state "Review and confirm no changes needed" rather than being omitted entirely. The forcing function (don't forget to check) must always be present.

### What to Update

When spec/doc updates are needed, here is what to consider:

**Spec files (`agent-development/agent-specs/`):**
- `architecture-breakdown.md` — new directories, modules, dependency changes, tech stack updates
- `agent-instructions.md` — new coding standards, dos/don'ts discovered during implementation
- `agent-workflow.md` — only if the workflow itself changes (rare)
- `git-workflow.md` — only if branching or commit conventions change (rare)

**Documentation:**
- `README.md` — new features, configuration options, setup steps
- `user-development/DEVELOPMENT-GUIDE.md` — only if the SDD workflow itself changes (rare)
- Any other project-specific docs

## Post-Completion

After all stages are complete (including any spec/doc stages or inline steps):

1. **Update `manifest.json`:**
   - Set `plan_metadata.status` to `done`
   - Set `current_stage` to `total_stages`
   - Confirm all stage statuses are `done` (or `skipped` with justification)

2. **Run the post-completion checklist** from `specification.md`. Verify every item.

3. **Perform file moves:**
   - **Move the plan folder:** `agent-development/queued/<plan-folder>/` → `agent-development/done/plans/<plan-folder>/`
   - **Move the matching request:** `agent-development/pending/<N>-<name>.md` → `agent-development/done/requests/<N>-<name>.md` (match by `task_id` in `manifest.json`)

4. **Commit the archive moves** as a separate commit:
   ```
   chore: <ticket-id> archive completed plan and request
   ```
   (Omit `<ticket-id>` if no ticket ID was detected in the branch name.)

## Plan Resumption

If execution is interrupted mid-plan (context window limit, agent crash, human pause):

1. The next agent conversation reads `manifest.json` to find `current_stage`.
2. Stages already marked `done` are **not re-executed**.
3. The agent picks up from the current stage and continues in order.
4. Git history confirms what has been committed — the agent can run `git log --oneline` to verify.

## Quick Fix Workflow

Quick fixes bypass the full plan pipeline. The workflow is:

1. Read all `agent-development/agent-specs/` documents for context.
2. Read the relevant source code.
3. Verify you are on a feature branch (not `main`). Extract the ticket ID from the branch name if present.
4. Make the minimum viable change (1–3 files).
5. Run verification checks (build, tests).
6. Assess whether spec or doc updates are needed:
   - If the change affects project structure or architectural conventions, update the relevant spec files.
   - If the change affects user-facing behavior, update `README.md` or other relevant docs.
   - For most quick fixes, no spec or doc updates will be needed — but check and call it out explicitly.
7. Create a log file in `agent-development/done/quick-fixes/` (see `user-development/prompts/4-quick-fix.md` for the format).
8. Commit all changes (source + any spec/doc updates + log file) as a single commit using conventional commit format. See `agent-development/agent-specs/git-workflow.md` for the commit message format.

If the change turns out to be larger or more ambiguous than expected, **stop** and recommend the full pipeline.

## Relationship to Other Spec Files

| File | What It Covers | How Often You Customize |
|---|---|---|
| `agent-instructions.md` | Coding standards, dos/don'ts, naming, testing, error handling | **Frequently** — evolves with your project |
| `agent-workflow.md` (this file) | Execution rules, blast radius, commit timing, spec/doc updates | **Rarely** — only if you change the SDD process itself |
| `architecture-breakdown.md` | Directory tree, module dependencies, design patterns, tech stack | **Per-task** — updated as part of spec updates |
| `application-overview.md` | What the app does, core workflows, UX goals | **Occasionally** — when scope or purpose shifts |
| `git-workflow.md` | Branching, commit format, ticket ID pattern, versioning | **Once at setup** — then rarely |