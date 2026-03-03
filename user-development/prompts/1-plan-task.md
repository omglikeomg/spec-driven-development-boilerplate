# Prompt: Plan a Task

> **Usage:** Copy this prompt into a new agent conversation. Replace `<TASK_FILE>` with a reference to the pending request file (e.g., `@1-docker-infrastructure.md`).

---

Read all documents in `agent-development/agent-specs/` for project context, then read the following task request:

**→ `<TASK_FILE>`**

Create a **detailed implementation plan** as a plan folder following the templates in `agent-development/plans/_templates/`.

## Plan Structure

Each plan is a folder in `agent-development/plans/` named `N-short-name` (matching the task number):

```
N-short-name/
├── manifest.json        ← Task state, stages, and context
├── specification.md     ← Human-readable overview (for review and approval)
├── 1-stage-name.md      ← Stage 1 instructions
├── ...                  ← Additional stages (if multi-stage)
├── N-1-spec-updates.md  ← Separate stage (multi-stage plans only)
└── N-docs-updates.md    ← Separate stage (multi-stage plans only)
```

Single-stage plans have one stage file with spec/doc updates as inline steps at the end. Multi-stage plans add spec and doc updates as separate final stages. See `agent-development/agent-specs/agent-workflow.md` for the full rules.

## Rules

1. **Read the source code** — it is the source of truth. Use `architecture-breakdown.md` for orientation.
2. **Check current project state** — existing files, dependency manifests, and completed plans in `agent-development/done/plans/`. Your plan must not conflict with what exists.
3. **Follow the templates exactly** — `manifest.json`, `specification.md`, and `stage.md` from `agent-development/plans/_templates/`.
4. **Be exhaustive** — the implementing agent has no context beyond the stage file, the manifest, and `agent-specs/`. Spell out every file path, function signature, and shell command.
5. **Break large plans into stages** — each stage should be a focused, independently verifiable unit of work. Spec/doc updates are separate final stages for multi-stage plans, or inline steps for single-stage plans (see `agent-workflow.md`).
6. **Populate the blast radius** in each stage file — explicitly list allowed read and write files. For single-stage plans, include spec/doc files in the blast radius.
7. **Do NOT implement any code.** This prompt is only for planning.

## Open Questions & Decisions

The `specification.md` includes an "Open Questions & Decisions" section. You **must** populate it:

- Surface any ambiguity (design choices, trade-offs, missing requirements).
- Present options with pros/cons and give a recommendation.
- Mark each human decision as `PENDING`.
- If there are genuinely no open questions, write "None — this plan is fully self-contained."

The human resolves all questions before moving the plan folder from `plans/` → `queued/`. Do NOT assume answers — leave them for the human.