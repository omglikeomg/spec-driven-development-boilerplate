# Prompt: Execute an Approved Plan

> **Usage:** Copy this prompt into a new agent conversation. Replace `<PLAN_FOLDER>` with a reference to the approved plan folder sitting in `queued/` (e.g., `@1-docker-infrastructure`).

---

Read and execute the approved plan at **→ `<PLAN_FOLDER>`**

## Before Starting

1. **Verify your branch** — run `git branch --show-current` to confirm you are on a feature branch (not `main`). If you are on `main`, **STOP** and ask the human to create a feature branch first. Extract the ticket ID from the branch name if one is present (pattern: `[A-Z][A-Z0-9]+-\d+`, e.g., `PROJ-123`). See `agent-development/agent-specs/git-workflow.md` for full details on branch naming and ticket ID detection.
2. **Read the `manifest.json`** in the plan folder. This is the authoritative record of task state, stages, and file scope.
3. **Read the `specification.md`** in the plan folder. This is the human-readable overview with context, open questions, and the file manifest.
4. **Read `agent-development/agent-specs/git-workflow.md`** for commit message format and conventions.
5. **Check the "Open Questions & Decisions" section** in `specification.md`. If any question still says `PENDING`, **STOP** and report which questions are unresolved. Do not execute a plan with pending decisions.
6. Treat resolved human decisions as **binding requirements** — they override the agent's original recommendation.
7. **Check `manifest.json` for `current_stage`** — if execution was previously interrupted, resume from the current stage rather than starting over. Stages already marked `done` should not be re-executed.

## While Executing

Execute stages **in order**, one at a time. For each stage:

1. **Read the stage's instruction file** (e.g., `1-stage-name.md`) from the plan folder.
2. **Respect the blast radius** — only read files listed in "Allowed Read Access" and only modify files listed in "Allowed Write Access". If you discover a dependency on an unlisted file, stop and update the manifest and stage file before proceeding.
3. **Follow the instructions exactly.** Do not add features, refactor code, or make architectural decisions that aren't in the stage instructions.
4. **Run all verification checks** listed in the stage's "Verification" section. If a check fails, fix the issue and retry (max 2 attempts per check). If it still fails, report the failure clearly and continue with the remaining stages.
5. **After a stage passes**, update `manifest.json`:
   - Set the stage's `status` to `done`
   - Increment `current_stage` to the next stage number
6. **Commit the stage** — commit all changes from this stage (including the `manifest.json` update) as a single commit using [Conventional Commits](https://www.conventionalcommits.org/) format. Choose the commit type based on what the stage actually does (`feat`, `fix`, `test`, `docs`, `refactor`, etc.). Include the ticket ID if one was detected in the branch name. See `agent-development/agent-specs/git-workflow.md` for the full commit message format. Example: `feat(books): PROJ-123 add pagination to list endpoint`.
7. **If a stage fails irrecoverably**, set its `status` to `failed` in `manifest.json`, follow the stage's rollback plan, and report the failure. Continue to the next stage only if it doesn't depend on the failed one.

### Mandatory Final Stages

Every plan ends with two mandatory stages:

- **Spec Updates (penultimate stage):** Update `agent-development/agent-specs/` files to reflect any changes introduced by this plan. If no spec changes are needed, mark the stage `skipped` with a brief justification in the manifest.
- **Documentation Updates (final stage):** Update `README.md` and any other human-facing documentation. If no doc changes are needed, mark the stage `skipped` with a brief justification in the manifest.

## After All Stages Pass

1. **Update `manifest.json`:**
   - Set `plan_metadata.status` to `done`
   - Set `current_stage` to `total_stages`
   - Confirm all stage statuses are `done` (or `skipped` with justification)

2. **Run the post-completion checklist** from `specification.md`. Verify every item.

3. **Perform file moves:**
   - **Move the plan folder:** `agent-development/queued/<plan-folder>/` → `agent-development/done/plans/<plan-folder>/`
   - **Move the matching request:** `agent-development/pending/<N>-<name>.md` → `agent-development/done/requests/<N>-<name>.md` (match by `task_id` in `manifest.json`)

4. **Commit the archive moves** as a separate commit from the implementation stages:
   ```
   chore: <ticket-id> archive completed plan and request
   ```
   (Omit `<ticket-id>` if no ticket ID was detected in the branch name.)

## Final Report

Provide a short summary:

- ✅ Stages completed (list each with its name and status)
- 🔑 Open questions — list each resolved question and the human decision that was applied
- ⚠️ Warnings or issues encountered (even if resolved)
- 📁 Files created or modified (aggregate across all stages)
- 🔀 Files moved (plan folder and request)
- 🔖 Commits made (list each commit message)