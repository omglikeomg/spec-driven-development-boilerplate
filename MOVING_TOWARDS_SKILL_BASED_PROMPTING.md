# Moving Towards Skill-Based Prompting

> **Purpose:** This document captures the architectural decisions, rationale, and migration path from the original copy-paste prompt system to the skills-based invocation paradigm. It serves as an intro point for future development sessions on this boilerplate.

---

## Context

The SDD boilerplate originally used a **copy-paste prompt system**: users would open a prompt file (e.g., `user-development/prompts/1-plan-task.md`), copy its entire contents, paste it into an agent chat window, manually edit placeholder values (file paths, links, descriptions), and send it.

This worked, but introduced friction — especially in editors where pasted content collapses into a reference rather than editable text, and when prompts are 80+ lines long with multiple placeholders to fill.

---

## Decision: Migrate to Project-Local Skills

**Date:** 2026-06-01  
**Decided by:** Tech Lead + Agent (collaborative session)

### What Changed

| Before | After |
|--------|-------|
| User copies prompt file | User states intent naturally |
| User edits placeholders in pasted text | Agent identifies targets from user's message |
| User sends 80-line block | User sends 1-2 sentences + a file reference |
| Agent needs all instructions in the message | Agent loads skill automatically by matching intent |
| Only works if editor supports editable paste | Works in any editor with skill support; fallback to copy-paste |

### Why Skills

1. **Zero friction** — "Plan the task in `pending/3-docker-infrastructure.md`" is all you need
2. **No placeholder errors** — the agent asks for missing info rather than relying on manual `<PLACEHOLDER>` replacement
3. **Session discipline preserved** — each skill is self-contained; fresh sessions still apply
4. **Backward compatible** — prompt files remain as documentation and fallback
5. **Project-local** — skills live in `.agents/skills/` and travel with the repo when cloned

### Why Project-Local (not Global)

Skills are in `.agents/skills/` (not `~/.agents/skills/`) because:
- The boilerplate is cloned into projects — skills should come with it
- Team members get the skills automatically via git
- Skills reference project-relative paths (`agent-development/`, `epics/`, etc.)
- Different projects may need different skill versions as the methodology evolves

---

## What Was Built

### Skills Created (9 total)

| Skill | Replaces | Type |
|-------|----------|------|
| `sdd-bootstrap-specs` | Prompt 0 | One-shot |
| `sdd-plan-task` | Prompt 1 | One-shot |
| `sdd-execute-plan` | Prompt 2 | One-shot |
| `sdd-create-request` | Prompt 3 | Interactive |
| `sdd-quick-fix` | Prompt 4 | One-shot |
| `sdd-create-epic` | Prompt 5 | Interactive |
| `sdd-break-down-epic` | Prompt 6 | One-shot |
| `sdd-refine-request` | Prompt 7 | Interactive |
| `sdd-amend-epic` | Prompt 8 | Interactive |

### Documents Updated

| Document | Changes |
|----------|---------|
| `README.md` | Repository structure includes `.agents/skills/`, Quick Start uses skill invocations, FAQ updated |
| `ADOPTION.md` | Phase 3 references bootstrap skill, workflow table shows natural language examples |
| `DEVELOPMENT-GUIDE.md` | "Prompt Templates" → "Prompt Templates & Skills", Quick Reference uses skills |
| `SQUAD_FLOW.md` | All steps reference skills, Session Discipline explains invocation model |
| `user-development/prompts/0-8` | New headers with invocation examples + legacy fallback note |
| `config/jira-ticket-templates.md` | Genericized (removed org-specific URLs), references skills |

### Documents Created

| Document | Purpose |
|----------|---------|
| `user-development/SQUAD_FLOW.md` | End-to-end team flow: Figma → Jira → GitHub with SDD |
| This file | Decision record and orientation for future sessions |

---

## Other Decisions Made in This Session

### 1. Single Branch Per Request (Plan + Execution)

**Before:** Plan merged to main as a separate PR, then execution started on a new branch.  
**After:** Plan, approval, and execution all live on the same branch. One PR, one merge.

**Rationale:** Eliminates noise in git history (dead plan artifacts on main if never executed), reduces branch juggling, and lets reviewers see planned vs. built in one diff.

### 2. Agent Creates Branch + Draft PR During Planning

The `sdd-plan-task` skill (Prompt 1) now creates the feature branch, commits the plan, pushes, and opens a draft PR using `gh pr create --draft`. Previously this was a manual step between planning and execution.

**Rationale:** Removes a manual step; the engineer is already in a session with the agent and the branch name is deterministic from `teams.yaml`.

### 3. Definition of Done Established at Epic Creation

Added a "Definition of Done" discovery category to `sdd-create-epic` (Prompt 5) and a section in the epic template. This ensures completion criteria are defined early, not improvised at the end.

### 4. Milestones from Software Design Document

`sdd-break-down-epic` (Prompt 6) now requires milestones from the Software Design Document and maps them to merge-groups in `delivery.yaml`. This connects the task breakdown to timeline expectations.

### 5. Epic Amendments Require TL + EM

`sdd-amend-epic` (Prompt 8) now mandates that both Tech Lead and Engineering Manager are informed and aligned before changes are applied. The `decided_by` field in negotiation records reflects all parties.

### 6. `discovered_during` Field for Followup Traceability

The request template now includes a `discovered_during` frontmatter field to trace followup work back to the plan that surfaced it.

### 7. Agent-Assisted Merge Conflict Resolution

SQUAD_FLOW.md documents that straightforward merge conflicts (imports, renames, additive changes) can be resolved by the agent in a session. Semantic conflicts requiring human judgment are resolved manually.

### 8. Jira Ticket Templates Genericized

Removed org-specific URLs (theknot.com, Flipper) from `config/jira-ticket-templates.md`. Templates now use `<your-domain>` placeholders with a customization note.

---

## Branch Structure

```
with-epics          ← SQUAD_FLOW.md + prompt/template updates (committed)
  └── epic-with-skills  ← Skills migration + documentation overhaul (3 commits)
```

### Commits on `epic-with-skills`:

1. `feat: migrate to skills-based invocation paradigm` — 8 skills created, all docs updated
2. `feat: update ADOPTION.md, Prompt 0, and genericize Jira templates` — 9th skill, adoption guide, Jira cleanup
3. `docs: add decision record for skill-based prompting migration` — this file

---

## Open Items / Future Work

- [ ] **Prompt 0 as a skill could be smarter** — it could detect the project's tech stack from lock files automatically instead of requiring the user to describe it
- [ ] **Skill versioning** — as the methodology evolves, skills may need version markers to handle projects at different maturity levels
- [ ] **Cross-editor testing** — verify the fallback prompt flow still works cleanly in Cursor, Windsurf, and VS Code Copilot Chat
- [ ] **`bin/dev` integration with skills** — could `bin/dev plan <request>` invoke the skill directly?
- [ ] **Prompt 6 milestone enforcement** — could validate that all tasks map to a milestone before producing output
- [ ] **Automated Jira sync** — the SQUAD_FLOW notes GitHub Actions handle PR→Jira transitions, but initial ticket creation via MCP could be more robust (error handling, retry)
- [ ] **Skill for PR review** — a skill that loads when an engineer asks to review a PR, pulling the plan context and blast radius automatically
