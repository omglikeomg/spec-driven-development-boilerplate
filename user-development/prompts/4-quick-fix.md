# Prompt: Quick Fix

> **Usage:** Copy this prompt into a new agent conversation. Replace `<CHANGE_DESCRIPTION>` with a plain-language description of the small change you need (e.g., "Extract the API base URL string used in 3 service files into a shared constant" or "Rename the `/books/list` endpoint to `/books`").

---

Familiarize yourself with the project context by reading the spec documents:

1. **Read all spec documents** in `agent-development/agent-specs/`:
   - `agent-development/agent-specs/agent-instructions.md`
   - `agent-development/agent-specs/agent-workflow.md`
   - `agent-development/agent-specs/application-overview.md`
   - `agent-development/agent-specs/architecture-breakdown.md`
   - `agent-development/agent-specs/git-workflow.md`

2. **Read the relevant source code** for the files involved in the change. Use `agent-development/agent-specs/architecture-breakdown.md` for quick orientation on the project layout if needed. The source code is the source of truth.

Then, implement the following change:

**→ `<CHANGE_DESCRIPTION>`**

## Qualifying Criteria

This prompt is for **small, mechanically obvious changes only**. A change qualifies as a quick fix if **all** of the following are true:

- It touches **1–3 files** (not counting spec/doc updates if needed)
- It involves **no design decisions or ambiguity** — there is one obviously correct way to do it
- It requires **no new dependencies**
- It does **not change public APIs, database schemas, or architectural patterns**
- It can be **fully described in a sentence or two**

Examples of quick fixes:
- Extract a repeated string literal into a named constant
- Rename or move a route/endpoint path
- Fix a typo in an error message or log statement
- Update a configuration value or default
- Add a missing type annotation
- Rename a variable or function for clarity

**If at any point you discover the change is larger or more ambiguous than expected — STOP.** Do not proceed. Instead, explain why this doesn't qualify as a quick fix and recommend that the user create a full task request using `user-development/prompts/3-request-feature.md` and follow the standard plan pipeline.

## Rules

1. **Read the spec documents and source code first** — even for small changes, you must understand the project's conventions and architecture before modifying anything.
2. **Respect the coding standards** in `agent-instructions.md` — quick fixes are not exempt from naming conventions, error handling patterns, or style rules.
3. **Make the minimum viable change** — do not refactor surrounding code, add features, or "improve" things that aren't part of the described change. Stay focused.
4. **Follow the quick fix workflow** defined in `agent-development/agent-specs/agent-workflow.md` — that file covers branch verification, verification checks, commit conventions, and spec/doc update assessment. Do not skip any of those steps.
5. **Do NOT create a plan folder, request file, or manifest.** Quick fixes bypass the full pipeline.

## Quick Fix Log Entry

After completing the change, create a log file in `agent-development/done/quick-fixes/` named with today's date and a short description:

**Filename pattern:** `YYYYMMDD-short-description.md` (e.g., `20250115-extract-api-base-url-constant.md`)

If multiple quick fixes happen on the same date, add a sequential suffix: `20250115-first-change.md`, `20250115-second-change.md`.

The log file must use this format:

```
# Quick Fix: <Short Description>

**Date:** YYYY-MM-DD
**Requested by:** human
**Change description:** <one or two sentences>

## Files Modified

| File | What Changed |
|---|---|
| `path/to/file` | Brief description of the modification |

## Verification

| Check | Result |
|---|---|
| `<build command>` | ✅ Pass / ❌ Fail |
| `<test command>` | ✅ Pass / ❌ Fail / ⏭️ N/A |

## Spec/Doc Updates

- [ ] `architecture-breakdown.md` — updated / not needed
- [ ] `README.md` — updated / not needed

## Notes

<!-- Any additional context, edge cases noticed, or follow-up items. Remove if empty. -->
```

## Final Report

After creating the log file and committing, provide a short summary:

- ✅ What was changed
- 📁 Files modified (list each)
- 🔍 Verification results
- 📝 Spec/doc updates made (if any)
- ⚠️ Warnings or follow-up items (if any)
- 🔖 Commit made (full commit message)