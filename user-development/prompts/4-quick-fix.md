# Prompt: Quick Fix

> **Usage:** Copy this prompt into a new agent conversation. Replace `<CHANGE_DESCRIPTION>` with a plain-language description of the small change you need (e.g., "Extract the API base URL string used in 3 service files into a shared constant" or "Rename the `/books/list` endpoint to `/books`").

---

Familiarize yourself with the project context by reading the spec documents:

1. **Read all spec documents** in `agent-development/agent-specs/`:
   - `agent-development/agent-specs/agent-instructions.md`
   - `agent-development/agent-specs/application-overview.md`
   - `agent-development/agent-specs/architecture-breakdown.md`
   - `agent-development/agent-specs/git-workflow.md`

2. **Read the relevant source code** for the files involved in the change. Use `agent-development/agent-specs/architecture-breakdown.md` for quick orientation on the project layout if needed. The source code is the source of truth.

3. **Verify your branch** — run `git branch --show-current` to confirm you are on a feature branch (not `main`). If you are on `main`, **STOP** and ask the human to create a feature branch first. Extract the ticket ID from the branch name if one is present (pattern: `[A-Z][A-Z0-9]+-\d+`, e.g., `PROJ-456`). See `agent-development/agent-specs/git-workflow.md` for full details on branch naming and ticket ID detection.

4. **Read `agent-development/agent-specs/git-workflow.md`** for commit message format and conventions.

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
4. **Run verification checks** — after making the change, run the project's build and test commands to confirm nothing is broken. If the project has a build command (e.g., `make build`, `yarn build`, `go build ./...`), run it. If there are relevant tests, run those too.
5. **Assess whether spec or doc updates are needed:**
   - If the change affects the project's folder structure or architectural conventions, update `agent-development/agent-specs/architecture-breakdown.md`.
   - If the change affects user-facing behavior, update `README.md` or other relevant docs.
   - For most quick fixes, **no spec or doc updates will be needed** — but check and call it out explicitly.
6. **Do NOT create a plan folder, request file, or manifest.** Quick fixes bypass the full pipeline.
7. **Commit the change** — after verification passes and the quick fix log file has been created, commit all changes (source modifications, any spec/doc updates, and the log file) as a **single commit** using [Conventional Commits](https://www.conventionalcommits.org/) format. Choose the commit type based on what the change actually does (`fix`, `refactor`, `style`, `chore`, etc.). Include the ticket ID if one was detected in the branch name. See `agent-development/agent-specs/git-workflow.md` for the full commit message format. Example: `fix(books): PROJ-456 correct off-by-one error in pagination offset`.

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

After creating the log file, provide a short summary:

- ✅ What was changed
- 📁 Files modified (list each)
- 🔍 Verification results
- 📝 Spec/doc updates made (if any)
- ⚠️ Warnings or follow-up items (if any)
- 🔖 Commit made (full commit message)