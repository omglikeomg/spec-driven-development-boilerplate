---
# ─────────────────────────────────────────────────────────────────────────────
# Plan Specification Metadata
# ─────────────────────────────────────────────────────────────────────────────
plan_id: null                   # References manifest.yaml task_id
title: ""
status: draft                   # Mirrors manifest.yaml — for quick reference only
# NOTE: Approval is tracked ONLY in manifest.yaml (plan_metadata.approval.status)
# To approve this plan: set approval.status to "approved" in manifest.yaml
---

# Implementation Plan: Task <N> — <Short Descriptive Title>

## Overview

<!-- A brief paragraph summarizing what this plan accomplishes. State the goal, the scope, and any important constraints. This should give a reviewing human (and later an implementing agent) a clear mental model before diving into the stages. -->

---

## Reference Documents

Before starting, the implementing agent **must** read and internalize these files:

| Document | Path | Purpose |
|---|---|---|
| Application Overview | `sdd/agent-development/agent-specs/application-overview.md` | Understand what the app does |
| Architecture Breakdown | `sdd/agent-development/agent-specs/architecture-breakdown.md` | Folder structure, design patterns, tech stack |
| Agent Instructions | `sdd/agent-development/agent-specs/agent-instructions.md` | Coding standards, dos/don'ts, naming, testing |
| Agent Workflow | `sdd/agent-development/agent-specs/agent-workflow.md` | Execution rules, blast radius, commit timing |
| Git Workflow | `sdd/agent-development/agent-specs/git-workflow.md` | Branching, commit conventions, versioning |
| Task Definition | `sdd/agent-development/pending/<N>-<name>.md` | The task being implemented |
<!-- Add any other relevant reference files (existing source files, previous plans, etc.) -->

---

## Pre-Conditions

<!-- List everything that must be true before this plan can be executed. -->

- Plan approval status is `approved` in `manifest.yaml` (see `plan_metadata.approval.status`)
- Pre-condition 1
- Pre-condition 2

---

## Stages

<!--
  Human-readable summary of the work breakdown.
  Detailed step-by-step instructions live in separate stage files.
  The manifest.yaml is the authoritative record of stage state.
  
  SINGLE-STAGE PLANS: Spec/doc updates are inline at the end of the single stage.
  MULTI-STAGE PLANS: Spec/doc updates are separate final stages.
  See agent-workflow.md for full rules.
-->

### Stage 1: <Stage Name>

**Complexity:** _Fibonacci (1-8)_
**Instruction file:** `1-stage-name.md`
**API Checkpoint:** _yes / no_

<!-- Brief description of what this stage does and why it's a discrete unit. -->

**Reads:** `path/to/context-file.ts`, ...
**Writes:** `path/to/new-or-modified-file.ts`, ...

---

### Stage N-1: Spec Updates _(multi-stage only)_

**Complexity:** 1
**Instruction file:** `N-1-spec-updates.md`

Update `sdd/agent-development/agent-specs/` files to reflect any architectural, structural, or convention changes introduced by this plan.

<!-- Describe which spec files are impacted. If no changes needed, state explicitly. -->

---

### Stage N: Documentation Updates _(multi-stage only)_

**Complexity:** 1
**Instruction file:** `N-documentation-updates.md`

Update human-facing documentation to reflect changes introduced by this plan.

<!-- Describe which docs are impacted. If no changes needed, state explicitly. -->

---

## Open Questions & Decisions

<!--
  MANDATORY SECTION. Captures ambiguities requiring human input before execution.
  
  During APPROVAL: the human reviewer reads each question, writes their decision
  inline (replacing PENDING), and sets frontmatter approval.status to "approved".
  
  The executing agent verifies no PENDING markers remain before starting.
  If there are genuinely no open questions, write:
  "None — this plan is fully self-contained." and explain briefly why.
-->

### Q1: <Short question title>

**Context:** <!-- Why this matters, what trade-offs exist -->

**Options:**
- **A)** ...
- **B)** ...

**Agent's recommendation:** <!-- Which option and why, or "No recommendation" -->

**Human decision:** `PENDING`

---

## File Manifest

| # | File Path | Action | Stage | Description |
|---|---|---|---|---|
| 1 | `path/to/file` | Created / Modified | 1 | Brief description |

**Total files created: X | Total files modified: Y**

---

## Post-Completion Checklist

- [ ] All stage `status` fields in `manifest.yaml` are `done` (or `skipped` with justification)
- [ ] All verification commands from every stage pass
- [ ] No unrelated files were modified outside blast radius
- [ ] `sdd/agent-development/agent-specs/` files are up to date
- [ ] `README.md` and relevant docs are up to date
- [ ] Plan `status` in manifest.yaml updated to `done`
- [ ] Plan folder archived to `sdd/agent-development/done/plans/`
- [ ] Request archived to `sdd/agent-development/done/requests/`

---

## Notes for the Implementing Agent

1. The source code is the source of truth — read it directly.
2. Execute stages in order. Do not start a stage until its predecessor is `done` in manifest.yaml.
3. After completing each stage, update its `status` in manifest.yaml and set `current_stage` to next.
4. Multiple commits per stage are allowed — each commit should be a self-contained unit.
5. Follow `sdd/agent-development/agent-specs/agent-workflow.md` for all execution rules.
6. Follow `sdd/agent-development/agent-specs/git-workflow.md` for commit and branch conventions.
