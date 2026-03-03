# Prompt: Execute an Approved Plan

> **Usage:** Copy this prompt into a new agent conversation. Replace `<PLAN_FOLDER>` with a reference to the approved plan folder in `queued/` (e.g., `@1-docker-infrastructure`).

---

Read and execute the approved plan at **→ `<PLAN_FOLDER>`**

## Before Starting

1. **Read all documents** in `agent-development/agent-specs/`.
2. **Read the plan's** `manifest.json` and `specification.md`.
3. **Check for unresolved questions** — if any "Open Questions & Decisions" entry in `specification.md` still says `PENDING`, **STOP** and report which are unresolved. Resolved human decisions are **binding requirements**.
4. **Check `current_stage` in `manifest.json`** — if execution was interrupted previously, resume from there. Do not re-execute stages already marked `done`.

## Execution

Follow `agent-development/agent-specs/agent-workflow.md` — it is the authoritative reference for stage execution, blast radius enforcement, manifest updates, commit conventions, spec/doc update handling, and post-completion file moves.

Execute stages in order. For each stage: read its instruction file, implement exactly what it says, run verification, update the manifest, and commit. Do not add features or make decisions beyond what the stage specifies.

If verification fails, fix and retry (max 2 attempts). If still failing, set the stage to `failed`, follow its rollback plan, and report clearly.

## Final Report

After all stages and archive moves are complete:

- ✅ Stages completed (name + status)
- 🔑 Resolved open questions and the human decisions applied
- ⚠️ Warnings or issues encountered
- 📁 Files created or modified
- 🔀 Files moved (plan folder and request)
- 🔖 Commits made (list each message)