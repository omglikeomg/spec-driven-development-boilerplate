# Prompt: Plan a Task

> **Usage:** Copy this prompt into a new agent conversation. Replace `<TASK_FILE>` with a reference to the pending request file (e.g., `@1-docker-infrastructure.md`).

---

Familiarize yourself with the project context by reading all documents in `agent-development/agent-specs/`:

- `agent-development/agent-specs/agent-instructions.md`
- `agent-development/agent-specs/agent-workflow.md`
- `agent-development/agent-specs/application-overview.md`
- `agent-development/agent-specs/architecture-breakdown.md`
- `agent-development/agent-specs/git-workflow.md`

Then, read the following task request:

**→ `<TASK_FILE>`**

Using the request and the context you gathered, create a **detailed implementation plan** as a plan folder following the templates in `agent-development/plans/_templates/`.

## Plan Structure

Each plan is a **folder** (not a single file) containing:

**For multi-stage plans** (2+ implementation stages):

```
agent-development/plans/N-short-name/
├── manifest.json        ← Authoritative record of task state, stages, and context
├── specification.md     ← Human-readable plan overview (for review and approval)
├── 1-stage-name.md      ← Stage 1 instructions for the implementing agent
├── 2-stage-name.md      ← Stage 2 instructions
├── ...                  ← As many stages as needed
├── N-1-spec-updates.md  ← Separate penultimate stage: update agent-development/agent-specs/
└── N-documentation-updates.md  ← Separate final stage: update README.md and human-facing docs
```

**For single-stage plans** (1 implementation stage):

```
agent-development/plans/N-short-name/
├── manifest.json        ← Authoritative record of task state, stages, and context
├── specification.md     ← Human-readable plan overview (for review and approval)
└── 1-stage-name.md      ← Single stage: implementation + inline spec/doc updates at the end
```

See `agent-development/agent-specs/agent-workflow.md` for the full rules on when spec/doc updates are separate stages vs. inline steps.

## Rules

1. **Read the source code directly** — the source code is the source of truth. Read the relevant files for the modules and areas you'll be planning changes to. Use `agent-development/agent-specs/architecture-breakdown.md` for quick orientation on the project layout if needed.
2. **Check the current project state** — look at the existing directory structure, existing source files, dependency manifests (`package.json`, `tsconfig.json`, etc.), and any previously completed plans in `agent-development/done/plans/` to understand what has already been built. Your plan must build on top of the current state, not conflict with it.
3. **Follow the templates exactly** — use the files in `agent-development/plans/_templates/` as your structural guide:
   - `manifest.json` — copy and fill in all fields for your plan
   - `specification.md` — the human-readable overview with open questions, file manifest, and post-completion checklist
   - `stage.md` — the per-stage instruction template (copy once per stage)
4. **Be exhaustive** — another AI agent will read the stage files and implement them. It will have no context beyond the stage file, the manifest, and the `agent-development/agent-specs/` documents. Every file to create/modify, every function signature, every shell command must be spelled out.
5. **Name the plan folder** using the pattern `N-short-name` where `N` matches the task number from the request filename (e.g., task `1-docker-infrastructure.md` → plan folder `1-docker-infrastructure/`).
6. **Save the plan folder** in `agent-development/plans/`.
7. **Break large plans into stages** — each stage should be a focused, independently verifiable unit of work. If a stage feels "large" in complexity, consider splitting it. **Spec and doc updates** must always be included in every plan, but their form depends on plan size:
   - **Multi-stage plans (2+ implementation stages):** Add spec updates and documentation updates as **separate final stages** (penultimate and last).
   - **Single-stage plans (1 implementation stage):** Include spec and doc updates as **final steps within the single stage** — do not create separate stages for them. This keeps small plans lightweight (1 stage, 1 commit).
   - In either case, if no spec or doc updates are needed, state that explicitly (mark stages `skipped` or note "no changes needed" in the inline steps).
8. **Populate the blast radius** in each stage file — explicitly list which files the implementing agent is allowed to read and write. This prevents agents from making unscoped changes. For single-stage plans with inline spec/doc updates, include the spec and doc files in the blast radius.
9. **Do NOT implement any code.** This prompt is only for planning.

## Open Questions & Decisions (IMPORTANT)

The `specification.md` template includes an **"Open Questions & Decisions"** section. You **must** populate this section thoughtfully:

- **Surface any ambiguity** — if the task request is vague about a design choice, API contract, naming convention, data format, or trade-off, write it up as a question.
- **Present options** — for each question, list the realistic options with pros/cons.
- **Give a recommendation** — state which option you'd choose and why, but mark the human decision as `PENDING`.
- **If there are genuinely no open questions**, write "None — this plan is fully self-contained." and briefly explain why.

The human will review the `specification.md` during the **approval process**. They will answer each question, and only then move the plan folder from `plans/` → `queued/` for execution. Do NOT assume answers to open questions — leave them for the human.