# Prompt: Amend an Active Epic (Interactive)

> **Usage:** Copy this prompt into a new agent conversation when an active epic needs modification. This handles: adding new tasks, splitting existing tasks, removing tasks, resequencing dependencies, or updating scope after external changes. Provide the epic path and describe what changed.

---

## ⚠️ CRITICAL RULE

**Do NOT write or modify any files until I explicitly tell you that the amendment is complete and I'm ready for you to apply changes.** Your job during the conversation is to analyze the impact, propose options, and help me make decisions. Only modify files when I say so.

---

## Input

**Epic to amend:** `epics/active/<N-epic-name>/`  
**Amendment trigger:** _[Describe what changed — new requirement, design revision, policy change, task needs splitting, etc.]_

---

## Your Role

You are a senior engineer performing change-impact analysis on an in-flight epic. Your job is to:

- **Understand the current state** — which tasks are done, in-progress, or pending
- **Assess the blast radius** — what does the change affect in the task graph, delivery manifest, and any in-progress work?
- **Propose the minimal amendment** — smallest change to the plan that accommodates the new requirement
- **Protect completed work** — never invalidate or require rework on tasks already marked `done` unless absolutely unavoidable
- **Maintain graph integrity** — dependency edges must remain valid, no orphans, no cycles

---

## Context to Read (Before Starting)

Before your first response, silently read:

1. **The epic** — `epics/active/<N-epic-name>/epic.md`
2. **The task graph** — `epics/active/<N-epic-name>/task-graph.md` (frontmatter for statuses + diagram for dependencies)
3. **The delivery manifest** — `epics/active/<N-epic-name>/delivery.yaml` (current PR state)
4. **All request files** — `epics/active/<N-epic-name>/requests/*.md` (to understand scope of each task)
5. **Agent specs** — `agent-development/agent-specs/architecture-breakdown.md`
6. **Status reference** — `user-development/STATUS-REFERENCE.md`
7. **Jira ticket templates** — `config/jira-ticket-templates.md`
8. **Relevant source code** — if the amendment is about implementation feasibility

---

## Amendment Types

| Type | Description | Typical Trigger |
|------|-------------|-----------------|
| **Insert task** | Add a new task into the dependency graph | New requirement discovered mid-flight |
| **Split task** | Break an existing `draft` or `refined` task into multiple tasks | Task is too large or has mixed concerns |
| **Remove task** | Mark a task as `skipped` and remove its edges | Requirement dropped or superseded |
| **Resequence** | Change dependency edges without adding/removing tasks | Implementation revealed a different optimal order |
| **Scope update** | Modify an existing task's requirements (not splitting) | Design revision or requirement clarification |
| **Scope extension** | Add tasks at the end of the graph (no insertion) | Follow-up work identified |

---

## Conversation Flow

### Phase 1: State Assessment

Respond with:

1. **"Epic status snapshot"** — table of all tasks with current status, who's working on them, which PRs exist
2. **"What's safe to change"** — tasks in `draft`, `refined`, or `activated` status can be freely modified. Tasks `in-progress` or `done` have constraints.
3. **"Impact of the trigger"** — which tasks are affected by the change, and how

### Phase 2: Amendment Proposal

Present one or more options:

For **task insertions:**
- New task gets the **next sequential ID** (e.g., if 5 tasks exist, new task is 6)
- Show updated dependency edges (which existing tasks now depend on the new task, and what the new task depends on)
- Show updated Mermaid diagram
- Flag any tasks that need their `depends_on` updated

For **task splits:**
- Original task ID is kept for one piece (the "core" that retains the original scope)
- Additional pieces get new sequential IDs
- Original task's complexity is re-estimated
- Show how Jira ticket will be handled (original ticket keeps one piece, new tickets for others)

For **removals:**
- Task status → `skipped`
- Edges are removed and downstream tasks' `depends_on` updated
- Jira ticket is cancelled/closed

For **resequencing:**
- Show before/after Mermaid diagrams
- Verify no cycles are introduced
- Flag any `in-progress` tasks whose dependencies change

### Phase 3: Confirm Decisions

Summarize:
1. Tasks added (with IDs, titles, dependencies, complexity)
2. Tasks modified (what changed)
3. Tasks removed/skipped
4. Updated critical path
5. Impact on in-progress work
6. Jira actions needed (new tickets, link changes, closures)

Ask: "Should I apply these changes?"

### Phase 4: Apply (only when I say so)

When I explicitly confirm:

1. **Update `epic.md`** — if scope boundaries or requirements changed, update them. Bump `last_updated`.

2. **Update `task-graph.md`:**
   - Add/modify/skip tasks in frontmatter `tasks[]`
   - Add a `negotiations[]` entry documenting this amendment:
     ```yaml
     - id: "neg-N"
       date: YYYY-MM-DD
       trigger: "<what changed>"
       type: product | design | engineering | policy  # amendment trigger category
       original_scope: "<what it was>"
       revised_scope: "<what it becomes>"
       rationale: "<why>"
       tasks_added: [N]        # new task IDs
       tasks_modified: [N]     # changed task IDs
       tasks_removed: [N]      # skipped task IDs
       impacted_tasks: [N]     # tasks whose dependencies changed
       decided_by: "<person>"
   - Update `total_tasks` count
   - Update `critical_path` if affected
   - Regenerate the Mermaid dependency diagram
   - Update `last_updated`

3. **Update `delivery.yaml`:**
   - Add/remove PR nodes as needed
   - Update `depends_on` edges in nodes
   - Recalculate `merge_order` groups
   - Add `negotiation_impacts[]` entry:
     ```yaml
     - negotiation_ref: "neg-N"
       date: YYYY-MM-DD
       impact: "<description>"
       nodes_added: ["pr-N"]
       nodes_removed: ["pr-N"]
       nodes_resequenced: ["pr-N"]
     ```
   - Bump `last_updated`

4. **Create new request files** (for inserted tasks):
   - File: `epics/active/<N-epic-name>/requests/<ID>-short-name.md`
   - Use the shell format initially (status: `draft`) OR full refined format if enough information exists
   - Follow `agent-development/pending/_TEMPLATE-request.md` structure

5. **Update existing request files** (for scope changes):
   - Modify requirements, deliverables, or edge cases as needed
   - Bump `last_updated` in frontmatter

6. **Jira operations** (if Atlassian MCP available):
   - Create tickets for new tasks (using `config/jira-ticket-templates.md`)
   - Update dependency links (Blocks / Is Blocked By)
   - Close/cancel tickets for skipped tasks
   - Update descriptions for scope-changed tasks
   - Ask before executing each Jira action

---

## ID Rules

- **IDs are immutable** — once a task has an ID, it never changes (even if the task is skipped)
- **New tasks get the next sequential integer** — if 5 tasks exist (1-5), new task is 6, regardless of where it fits in the dependency graph
- **Position in the graph is determined by edges, not by ID number** — Task 6 can depend on Task 2 and block Task 3
- **Mermaid diagram shows logical flow** — visual ordering reflects dependencies, not ID sequence

---

## Constraints

1. **Never modify a `done` task** — if rework is needed on completed work, create a NEW task that addresses the gap
2. **Never change a task's ID** — IDs are permanent references (used in Jira, commits, PR descriptions)
3. **`in-progress` tasks can only have minor scope adjustments** — if major changes are needed, consider creating a follow-up task instead
4. **Preserve the negotiation audit trail** — every amendment must be recorded in `negotiations[]`
5. **Re-estimate complexity** — any task whose scope changed should have its Fibonacci estimate reviewed
6. **Update the epic status** — set to `renegotiating` at the start of amendment, return to `active` after changes are applied

---

## Output Quality Bar

The amendment must leave the epic in a state where:
- The Mermaid diagram accurately reflects all dependency edges
- No task has a `depends_on` referencing a `skipped` task
- The critical path is recalculated
- `delivery.yaml` merge order is consistent with the updated graph
- Any engineer can look at the task-graph and understand what changed and why (via `negotiations[]`)
