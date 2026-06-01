---
# ─────────────────────────────────────────────────────────────────────────────
# Request Metadata (machine-parseable)
# ─────────────────────────────────────────────────────────────────────────────
id: null              # Sequential task number (e.g., 1, 2, 3)
title: ""
status: draft         # draft | refined | activated | planned | done
complexity: null      # Fibonacci: 1 | 2 | 3 | 5 | 8 | 13
jira_ticket: null     # e.g., PROJ-123 — filled after ticket creation
epic: null            # Path to epic.md (e.g., "../../epics/active/1-feature-name/epic.md"), or "standalone"
discovered_during: null  # Plan ID that surfaced this work (e.g., "3-add-notifications"), or null if planned from the start
depends_on: []        # Task IDs that must be done before this task
created: null         # YYYY-MM-DD
last_updated: null    # YYYY-MM-DD
api_checkpoint: false # true if this task changes observable API behavior (endpoints, response shapes)
---

# Task <N>: <Short Descriptive Title>

## Goal

<!-- One or two sentences describing what this task achieves. What is the end state? -->

## Context

<!-- Why is this task needed? What problem does it solve? Reference any prerequisite tasks by number (e.g., "Requires Task 2 to be completed first"). Explain how this fits into the broader application architecture. -->

## Requirements

<!-- A bulleted list of concrete requirements. Each requirement should be verifiable — the implementing agent (or reviewer) should be able to confirm whether it was met or not. -->

- **R1.** ...
- **R2.** ...
- **R3.** ...

## Implementation Details

<!-- Detailed technical guidance for the implementing agent. Include: -->
<!-- - Which files to create or modify (with full paths from project root) -->
<!-- - Type definitions, function signatures, or interface contracts -->
<!-- - Algorithmic notes or edge cases to handle -->
<!-- - Any concurrency or error-handling considerations -->

1. **Component Name (`/path/to/file.ts`):**
   - Detail 1
   - Detail 2

## Edge Cases

<!-- Known edge cases the implementation must handle. Added during refinement (Prompt 7). -->

- ...

## Deliverables

<!-- A checklist of tangible outputs. What files, features, or artifacts must exist when this task is done? -->

- [ ] Deliverable 1
- [ ] Deliverable 2

## Acceptance Criteria

<!-- Verifiable criteria that define "done" for this task. Added during refinement (Prompt 7). -->
<!-- Use specific, testable statements. Prefer Given/When/Then for behavioral criteria. -->
<!-- Together these should cover: happy path, error cases, and edge cases. -->

- [ ] [Criterion 1 — specific and testable]
- [ ] [Criterion 2 — specific and testable]
- [ ] [Criterion 3 — specific and testable]

## Agent Checklist

<!-- Verification steps the implementing agent must complete before marking this task as done. These should be concrete, runnable checks — not vague affirmations. -->

- [ ] Project compiles with zero errors
- [ ] Unit tests pass
- [ ] Linter passes with no new warnings
- [ ] Update `agent-development/agent-specs/architecture-breakdown.md` if new modules, interfaces, directories, or significant files were introduced
- [ ] Update `README.md` with latest considerations if user-facing behavior changed
