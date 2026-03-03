# Prompt: Quick Fix

> **Usage:** Copy this prompt into a new agent conversation. Replace `<CHANGE_DESCRIPTION>` with a plain-language description of the small change you need.

---

Read all documents in `agent-development/agent-specs/` for project context, then read the relevant source code for the files involved in the change.

Implement the following change:

**→ `<CHANGE_DESCRIPTION>`**

## Qualifying Criteria

This prompt is for **small, mechanically obvious changes only** — all of the following must be true:

- Touches **1–3 files** (not counting spec/doc updates)
- **No design decisions or ambiguity** — one obviously correct approach
- **No new dependencies**, no public API / schema / architecture changes
- **Fully described in a sentence or two**

**If you discover the change is larger or more ambiguous than expected — STOP.** Explain why and recommend a full task request via `user-development/prompts/3-request-feature.md`.

## Rules

1. Read spec documents and source code first — understand conventions before modifying anything.
2. Respect the coding standards in `agent-instructions.md`.
3. Make the **minimum viable change** — do not refactor, add features, or "improve" surrounding code.
4. Follow the **quick fix workflow** in `agent-development/agent-specs/agent-workflow.md` (branch verification, verification checks, commit conventions, spec/doc update assessment).
5. Do NOT create a plan folder, request file, or manifest.

## Quick Fix Log

Create a log file in `agent-development/done/quick-fixes/` named `YYYYMMDD-short-description.md` (add a sequential suffix if multiple fixes share a date). Use this format:

```
# Quick Fix: <Short Description>

**Date:** YYYY-MM-DD
**Change description:** <one or two sentences>

## Files Modified

| File | What Changed |
|---|---|
| `path/to/file` | Brief description |

## Verification

| Check | Result |
|---|---|
| `<build command>` | ✅ Pass / ❌ Fail |
| `<test command>` | ✅ Pass / ❌ Fail / ⏭️ N/A |

## Spec/Doc Updates

- [ ] `architecture-breakdown.md` — updated / not needed
- [ ] `README.md` — updated / not needed

## Notes

<!-- Any additional context or follow-up items. Remove if empty. -->
```

## Final Report

After creating the log file and committing:

- ✅ What was changed
- 📁 Files modified
- 🔍 Verification results
- 📝 Spec/doc updates (if any)
- ⚠️ Warnings or follow-up items (if any)
- 🔖 Commit message