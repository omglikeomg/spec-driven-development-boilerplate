# Implementation Plan: Task <N> — <Short Descriptive Title>

## Overview

<!-- A brief paragraph summarizing what this plan accomplishes. State the goal, the scope, and any important constraints. This should give a reviewing human (and later an implementing agent) a clear mental model before diving into the stages. -->

---

## Reference Documents

Before starting, the implementing agent **must** read and internalize these files:

| Document | Path | Purpose |
|---|---|---|
| Application Overview | `agent-development/agent-specs/application-overview.md` | Understand what the tool does |
| Architecture Breakdown | `agent-development/agent-specs/architecture-breakdown.md` | Folder structure, design patterns, tech stack, module dependencies |
| Agent Instructions | `agent-development/agent-specs/agent-instructions.md` | Coding standards, dos/don'ts, workflow |
| Git Workflow | `agent-development/agent-specs/git-workflow.md` | Branching strategy, commit conventions, versioning expectations |
| Task Definition | `agent-development/pending/<N>-<name>.md` | The task being implemented |
<!-- Add any other relevant reference files (existing source files, previous plans, etc.) -->

---

## Pre-Conditions

<!-- List everything that must be true before this plan can be executed. Examples: -->
<!-- - Which previous tasks must be completed? -->
<!-- - What files or directories must already exist? -->
<!-- - What tools or dependencies must be installed? -->

- Pre-condition 1
- Pre-condition 2

---

## Stages

<!--
  This section provides a human-readable summary of how the work is broken down.
  The detailed step-by-step instructions for each stage live in separate files
  (1-stage-name.md, 2-stage-name.md, etc.) within this plan folder.

  The manifest.json is the authoritative record of stage state, context files,
  output files, and verification commands. This section is for review and approval.

  Not all plans need multiple stages. Small tasks can have a single implementation
  stage. However, ALL plans must end with the two mandatory final stages:
  spec updates and documentation updates.
-->

### Stage 1: <Stage Name>

**Complexity:** small | medium | large
**Instruction file:** `1-stage-name.md`

<!-- Brief description of what this stage does and why it's a discrete unit of work. -->
<!-- List the key files read and written so the reviewer can assess the scope. -->

**Reads:** `path/to/context-file.ts`, `path/to/another-file.ts`
**Writes:** `path/to/new-file.ts`, `path/to/modified-file.ts`

---

### Stage 2: <Stage Name>

**Complexity:** small | medium | large
**Instruction file:** `2-stage-name.md`

<!-- ... -->

**Reads:** ...
**Writes:** ...

---

<!-- Repeat for as many stages as needed. -->

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- MANDATORY FINAL STAGES — every plan must end with these   -->
<!-- ═══════════════════════════════════════════════════════════ -->

### Stage N-1: Spec Updates

**Complexity:** small
**Instruction file:** `N-1-spec-updates.md`

Update `agent-development/agent-specs/` files to reflect any architectural, structural, or convention changes introduced by this plan. The planning agent should list which spec files need updating and what changes are expected.

<!-- Describe which spec files are impacted and what kind of changes are needed. -->
<!-- If no spec changes are needed, state that explicitly and the stage can be marked 'skipped' during execution. -->

---

### Stage N: Documentation Updates

**Complexity:** small
**Instruction file:** `N-documentation-updates.md`

Update human-facing documentation (`README.md`, `DEVELOPMENT-GUIDE.md`, and any other relevant docs) to reflect changes introduced by this plan.

<!-- Describe which docs are impacted and what kind of changes are needed. -->
<!-- If no documentation changes are needed, state that explicitly and the stage can be marked 'skipped' during execution. -->

---

## Open Questions & Decisions

<!--
This section is MANDATORY. It captures questions, ambiguities, or design decisions that the planning agent cannot resolve on its own and that require human input before the plan can be executed.

During the APPROVAL PROCESS, the human reviewer will:
1. Read each question below.
2. Write their answer or decision inline (replacing the placeholder).
3. Once all questions are resolved, move the plan folder from plans/ to queued/.

If there are genuinely no open questions, write "None — this plan is fully self-contained." and explain briefly why no decisions were needed.
-->

### Q1: <Short question title>

**Context:** <!-- Why this question matters. What are the trade-offs? What did the planning agent consider? -->

**Options:**
- **A)** <!-- Option description -->
- **B)** <!-- Option description -->

**Agent's recommendation:** <!-- Which option the agent leans toward and why, or "No recommendation — this is a pure preference call." -->

**Human decision:** `PENDING` <!-- The human replaces PENDING with their chosen option and any additional notes -->

---

### Q2: <Short question title>

**Context:** <!-- ... -->

**Options:**
- **A)** <!-- ... -->
- **B)** <!-- ... -->

**Agent's recommendation:** <!-- ... -->

**Human decision:** `PENDING`

---

<!-- Add as many questions as needed. Remove unused Q slots. -->

---

## File Manifest

Summary of every file created or modified across all stages of this plan:

| # | File Path | Action | Stage | Content Summary |
|---|---|---|---|---|
| 1 | `path/to/file` | Created / Modified | 1 | Brief description of what's in the file |
<!-- Action should be "Created" for new files or "Modified" for changes to existing files. -->

**Total files created: X | Total files modified: Y**

---

## Post-Completion Checklist

The implementing agent must verify each item after ALL stages are complete:

- [ ] All stage `status` fields in `manifest.json` are `done` (or `skipped` with justification)
- [ ] All verification commands from every stage pass
- [ ] No unrelated files were modified or deleted
- [ ] `agent-development/agent-specs/` files are up to date (Stage N-1)
- [ ] `README.md` and relevant human docs are up to date (Stage N)

---

## Notes for the Implementing Agent

<!-- Any additional guidance, warnings, or clarifications that don't fit into the stages above. Examples: -->
<!-- - Things the agent should NOT do -->
<!-- - Edge cases to be aware of -->
<!-- - Explanations of non-obvious design decisions -->

1. The source code is the source of truth — read it directly.
2. Execute stages in order. Do not start a stage until its predecessor is marked `done` in `manifest.json`.
3. After completing each stage, update its `status` in `manifest.json` to `done` and set `current_stage` to the next stage number.
4. Note 1
5. Note 2