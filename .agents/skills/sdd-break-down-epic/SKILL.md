---
name: sdd-break-down-epic
description: Break down an SDD epic into a task dependency graph. Use when the user has a completed epic.md (status decomposed) and wants to produce the task-graph.md, delivery.yaml, and request shell files. One-shot operation.
---

# SDD Break Down Epic — Task Dependency Graph Generation

## Context Loading

Before beginning, read and internalize:

1. **Epic** — the target `epic.md` from `epics/active/N-epic-name/`
2. Agent specs — `agent-development/agent-specs/application-overview.md`, `agent-development/agent-specs/architecture-breakdown.md`
3. `config/teams.yaml` — team structure, ownership
4. Relevant source code — scan areas impacted by the epic
5. **Software Design Document** — linked in epic.md references (goals, non-goals, milestones, estimation). If milestones are NOT present in the SDD, **ask the user before proceeding** — milestone alignment is required
6. Templates:
   - `epics/_templates/task-graph.md`
   - `epics/_templates/delivery.yaml`
   - `agent-development/pending/_TEMPLATE-request.md`
   - `config/jira-ticket-templates.md`
7. Status reference — `user-development/STATUS-REFERENCE.md`

## Task

Decompose the epic into a **task DAG** (Directed Acyclic Graph) with request shells for each task.

### Milestone Alignment

- Map each task to a milestone from the Software Design Document
- Each milestone = a **merge-group** in `delivery.yaml`
- Tasks within a milestone can be parallelized; milestones are sequential gates

## Rules

Each task MUST satisfy ALL of these constraints:

1. **One coherent unit** — one branch, one PR, one logical change
2. **Minimize dependencies** — maximize parallelization potential
3. **Order by risk** — highest-risk tasks first (fail fast)
4. **Separate concerns** — don't mix unrelated changes
5. **Spec/doc updates are NOT separate tasks** — they're part of the task that introduces the change
6. **Completable in one session** — <500 LOC changed, <5 files modified
7. **Fibonacci complexity** — estimate each task: 1, 2, 3, 5, 8, 13
8. **Verb-based names** — e.g., "implement-auth-middleware", "add-user-profile-endpoint"
9. **Shells structurally complete** — follow full template structure with sections populated as much as possible from epic context
10. **Preliminary acceptance criteria** — include 2–3 acceptance criteria per task (refined later in Prompt 7)

## Output

### 1. `task-graph.md`

Write to `epics/active/N-epic-name/task-graph.md`:

- **YAML frontmatter** with `tasks:` array (id, name, status, complexity, milestone, depends_on)
- **Mermaid diagram** showing the full DAG
- **Parallelization notes** — which tasks can run concurrently
- **Critical path** — the longest dependency chain with total complexity
- **Jira section** — placeholder for ticket IDs (populated during refinement)
- **Activation checklist** — what's needed before work begins

### 2. `delivery.yaml`

Write to `epics/active/N-epic-name/delivery.yaml`:

- PR nodes with task references
- `depends_on` edges
- `merge_order` groups with `milestone` field
- `branching_strategy` section

### 3. Request Shells

Write to `epics/active/N-epic-name/requests/` — one file per task:

- Filename: `NNN-task-name.md` (zero-padded task ID)
- Follow full template structure from `_TEMPLATE-request.md`
- Include `discovered_during: null` field in frontmatter
- Fill in what's known from epic context
- Leave implementation details for refinement (Prompt 7)

## Jira

**Jira tickets are NOT created at this stage.** They are created after refinement via the `sdd-refine-request` skill (Prompt 7). The task-graph.md includes a Jira section as a placeholder.

## Summary Output

After generating all files, present a summary:

- **Total tasks** — count
- **Complexity distribution** — histogram of Fibonacci estimates
- **Critical path** — tasks and total complexity points
- **Milestone mapping** — which tasks belong to which milestone
- **Parallelization options** — maximum concurrent tasks at each stage
- **Recommended refinement order** — which tasks to refine first (dependencies, risk)
- **Recommended activation order** — which tasks to start first

## Entry Point

If the user doesn't specify which epic to break down, ask them. Check `epics/active/` for epics with `status: decomposed` in their frontmatter — these are ready for breakdown.
