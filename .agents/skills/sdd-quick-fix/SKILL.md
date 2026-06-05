---
name: sdd-quick-fix
description: Make a small, obvious code change that bypasses the full SDD pipeline. Use when the user describes a trivial change (1-3 files, no design decisions, no new dependencies, no API/schema changes). Implements the fix and creates a log file.
---

# SDD Quick Fix

You are making a small, mechanically obvious change that bypasses the full SDD pipeline (no request file, no plan folder, no manifest).

---

## Identify the Change

If the user described what they want fixed in their message, proceed immediately. If not, ask them what small change they need.

---

## Context to Read (Before Starting)

Before making any change, silently read:

1. **All agent specs:**
   - `agent-development/agent-specs/agent-instructions.md`
   - `agent-development/agent-specs/agent-workflow.md`
   - `agent-development/agent-specs/application-overview.md`
   - `agent-development/agent-specs/architecture-breakdown.md`
   - `agent-development/agent-specs/git-workflow.md`
2. **Relevant source code** — the files involved in the change. Use `architecture-breakdown.md` for quick orientation on the project layout.

---

## Qualifying Criteria

A change qualifies as a quick fix if **ALL** of the following are true:

- It touches **1–3 files** (not counting spec/doc updates)
- It involves **no design decisions or ambiguity** — there is one obviously correct way to do it
- It requires **no new dependencies**
- It does **not change public APIs, database schemas, or architectural patterns**
- It can be **fully described in a sentence or two**

### Examples of Quick Fixes

- Extract a repeated string literal into a named constant
- Rename or move a route/endpoint path
- Fix a typo in an error message or log statement
- Update a configuration value or default
- Add a missing type annotation
- Rename a variable or function for clarity

---

## ⚠️ ESCAPE HATCH

**If at any point you discover the change is larger or more ambiguous than expected — STOP immediately.** Do not proceed. Instead:

1. Explain why this doesn't qualify as a quick fix
2. Recommend that the user create a full task request using the `sdd-create-request` skill and follow the standard plan pipeline

---

## Rules

1. **Read the spec documents and source code first** — even for small changes, you must understand the project's conventions before modifying anything
2. **Respect the coding standards** in `agent-instructions.md` — quick fixes are not exempt from naming conventions, error handling patterns, or style rules
3. **Make the minimum viable change** — do not refactor surrounding code, add features, or "improve" things that aren't part of the described change
4. **Follow the quick fix workflow** defined in `agent-development/agent-specs/agent-workflow.md` — that file covers branch verification, verification checks, commit conventions, and spec/doc update assessment
5. **Do NOT create a plan folder, request file, or manifest** — quick fixes bypass the full pipeline

---

## Implementation

1. Implement the change with surgical precision
2. Run verification (build, lint, typecheck, relevant tests)
3. Commit following the conventional commit format from `git-workflow.md` with co-author trailer from `config/teams.yaml`
4. Assess whether spec/doc files need updates

---

## Quick Fix Log Entry

After completing the change, create a log file in `agent-development/done/quick-fixes/` with the following naming pattern:

**Filename:** `YYYYMMDD-short-description.md` (e.g., `20250601-extract-api-base-url-constant.md`)

If multiple quick fixes happen on the same date, add a sequential suffix: `YYYYMMDD-first-change.md`, `YYYYMMDD-second-change.md`.

Use this format:

```markdown
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

---

## Final Report

After creating the log file and committing, provide a summary:

- ✅ What was changed
- 📁 Files modified (list each)
- 🔍 Verification results
- 📝 Spec/doc updates made (if any)
- ⚠️ Warnings or follow-up items (if any)
- 🔖 Commit message used

---

## PR Description

After the final report, generate a **ready-to-paste PR description** following `user-development/PR_TEMPLATE.md` (simplified for quick fixes — omit the Review Guide table and Epic & Plan Context section since this is a single-commit change). Fill in:

- Description
- Related Issue (if a ticket exists)
- Types of changes
- Checklist

Present it in a fenced code block for easy copy-paste.
