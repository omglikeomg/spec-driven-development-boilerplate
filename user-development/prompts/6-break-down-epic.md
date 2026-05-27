# Prompt: Break Down an Epic into Tasks

> **Usage:** Copy this prompt into a new agent conversation. Provide the path to the approved epic folder. The agent will produce a task graph, delivery manifest, and skeleton request files.

---

## Input

**Epic to break down:** `epics/active/<N-epic-name>/`

---

## Context to Read

Before producing the breakdown, read:

1. **The epic** — `epics/active/<N-epic-name>/epic.md`
2. **Agent specs** — all files in `agent-development/agent-specs/`
3. **Team config** — `config/teams.yaml` (for Jira settings, branching conventions)
4. **Architecture docs** — relevant files from `agent-development/agent-specs/architecture-breakdown.md`
5. **Relevant source code** — files/modules identified in the epic's Technical Constraints
6. **Templates:**
   - `epics/_templates/task-graph.md`
   - `epics/_templates/delivery.yaml`
   - `agent-development/pending/_TEMPLATE-request.md` (request structure to follow)
   - `config/jira-ticket-templates.md` (for understanding what Jira tickets will need)
7. **Status reference** — `user-development/STATUS-REFERENCE.md`

---

## Your Task

Decompose the epic into a task DAG. Each task becomes a request file — at this stage you produce **shells** with enough structure that refinement (Prompt 7) can fill in details without restructuring. The shells must follow the same section layout as the full request template.

---

## Rules

1. **Each task = one coherent unit of work** — one branch, one PR, independently mergeable once dependencies are met.
2. **Minimize dependencies** — prefer parallel over serial. Only add edges when Task B literally cannot be implemented without Task A's output.
3. **Order by risk** — foundational/infra tasks first, UI tasks after.
4. **Separate concerns** — data layer separate from UI, config separate from logic, migration separate from creation.
5. **Spec & doc updates are NOT separate tasks** — they're inline within each task's plan.
6. **Each task completable in one agent session** — if >500 LOC or >5 files, split further.
7. **Estimate complexity** — use Fibonacci (1, 2, 3, 5, 8, 13) per task.
8. **Name tasks with clear verbs** — "Register experiment", "Create data atom", "Migrate component X"
9. **Shells must be structurally complete** — include all sections from the request template (even if content is minimal). This prevents restructuring during refinement.
10. **Include preliminary acceptance criteria** — even at shell stage, write 2-3 high-level acceptance criteria per task. These will be expanded during refinement.

---

## Output

### 1. `task-graph.md`

Write to `epics/active/<N-epic-name>/task-graph.md` following the template. Include:
- YAML frontmatter with all tasks (status: `draft`, complexity estimated)
- Mermaid.js dependency diagram (NOT ASCII art)
- Parallelization notes and critical path
- Jira ticket creation section (noting tickets will be created after refinement)
- Activation checklist

### 2. `delivery.yaml`

Write to `epics/active/<N-epic-name>/delivery.yaml` following the template. Include:
- One PR node per task
- `depends_on` edges matching the task-graph
- `merge_order` groups derived from the dependency DAG
- `branching_strategy` recommendation with rationale

### 3. Request Shell Files

For each task, create a file in `epics/active/<N-epic-name>/requests/` named `N-short-description.md`.

**The shell MUST follow the full request template structure** (from `agent-development/pending/_TEMPLATE-request.md`). Fill what you can; mark sections that need refinement with a placeholder note.

```markdown
---
# ─────────────────────────────────────────────────────────────────────────────
# Request Metadata (machine-parseable)
# ─────────────────────────────────────────────────────────────────────────────
id: N
title: "<Title>"
status: draft
complexity: <fibonacci>
jira_ticket: null
epic: "../../epic.md"
depends_on: []        # Task IDs that must be done before this task
created: <today>
last_updated: <today>
api_checkpoint: false # true if this task changes observable API behavior
---

# Task N: <Title>

## Goal

<!-- One or two sentences describing what this task achieves. What is the end state? -->
<Write a clear, concise goal statement.>

## Context

<!-- Why this task is needed, how it fits the epic, what the current state is. -->
<Explain the current state, what changes, and how this fits the broader epic.
Reference dependency tasks by number if applicable.>

## Requirements

<!-- Concrete requirements — verifiable by reviewer or implementing agent. -->
<!-- At shell stage: write 3-5 high-level requirements. Refinement will expand these. -->

- **R1.** <Primary requirement>
- **R2.** <Secondary requirement>
- **R3.** <Additional requirement>

## Implementation Details

<!-- Detailed technical guidance. At shell stage: note the general approach and key files. -->
<!-- Full details will be added during refinement (Prompt 7). -->

> ⚠️ **Shell — to be expanded during refinement.** General approach:
> - <High-level approach note 1>
> - <Key files/modules likely involved>

## Edge Cases

<!-- Known edge cases. At shell stage: list any obvious ones from the epic discussion. -->
<!-- Additional edge cases will be surfaced during refinement (Prompt 7). -->

- <Obvious edge case from epic, or "To be identified during refinement">

## Deliverables

<!-- Tangible outputs when this task is done. -->

- [ ] <Primary deliverable>
- [ ] <Secondary deliverable>

## Acceptance Criteria

<!-- Verifiable criteria for "done". At shell stage: 2-3 high-level criteria. -->
<!-- These will be expanded into specific scenarios during refinement (Prompt 7). -->

- [ ] <High-level acceptance criterion 1>
- [ ] <High-level acceptance criterion 2>
- [ ] <High-level acceptance criterion 3>

## Agent Checklist

- [ ] Project compiles with zero errors
- [ ] Unit tests pass
- [ ] Linter passes with no new warnings
- [ ] Update `agent-development/agent-specs/architecture-breakdown.md` if new modules, interfaces, directories, or significant files were introduced
- [ ] Update `README.md` with latest considerations if user-facing behavior changed

---

> ⚠️ **This is a request shell.** It will be refined into a full request using Prompt 7 before activation and Jira ticket creation.
```

### 4. Jira Ticket Timing

**Important:** Jira tickets are NOT created at this stage. They are created after refinement (Prompt 7) when the task has full requirements and acceptance criteria. This ensures tickets are born with sufficient context.

After presenting the breakdown, inform the human:

> "Jira tickets will be created after tasks are refined (Prompt 7). This ensures each ticket has full requirements, acceptance criteria, and implementation context from day one. See `config/jira-ticket-templates.md` for the ticket content standard."

### 5. Summary

Provide:
- Total tasks and complexity distribution
- Critical path (longest dependency chain)
- Which tasks can be parallelized
- Recommended refinement order (which tasks to refine first)
- Recommended activation order
