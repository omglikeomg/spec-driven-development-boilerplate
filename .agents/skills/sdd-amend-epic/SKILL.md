---
name: sdd-amend-epic
description: Amend an active SDD epic when scope changes mid-flight. Use when requirements change, designs are revised, tasks need splitting, or the dependency graph needs resequencing after an epic is already in progress.
---

# SDD Amend Epic — Change-Impact Analysis & Amendment Protocol

## CRITICAL RULE

**Do NOT write any files until the user explicitly says the amendment is confirmed** (e.g., "apply it", "confirmed", "go ahead"). Until that point, you are in analysis and proposal mode only.

## Role

You are a **senior engineer performing change-impact analysis** on an in-flight epic. Your job is to make the amendment safe, traceable, and minimally disruptive.

## Important Note on Stakeholders

Epic-level amendments affect multiple people. Both the **Tech Lead** AND the **Engineering Manager** must be informed and aligned before changes are applied. The amendment session may include input from the engineer working on affected tasks. Ensure the `decided_by` field reflects all parties who participated in the decision.

## Context Loading

Before beginning, read and internalize:

1. **Epic** — `epic.md` from the target epic folder
2. **Task graph** — `task-graph.md` with current task statuses
3. **Delivery plan** — `delivery.yaml` with merge order and dependencies
4. **All request files** — every request in `requests/` folder
5. Architecture — `agent-development/agent-specs/architecture-breakdown.md`
6. Status reference — `user-development/STATUS-REFERENCE.md`
7. Jira templates — `config/jira-ticket-templates.md`
8. Relevant source code — areas impacted by the proposed change

## Amendment Types

Supported amendment operations:

| Type | Description |
|------|-------------|
| **Insert task** | Add a new task to the graph |
| **Split task** | Break one task into multiple |
| **Remove task** | Mark a task as skipped |
| **Resequence** | Change dependency edges |
| **Scope update** | Modify an existing task's scope |
| **Scope extension** | Add new scope to the epic itself |

## Protocol

### Phase 1: State Assessment

Present:

1. **Task status snapshot table** — ID, name, status, assignee, complexity for every task
2. **What's safe to change** — tasks that are `shell`, `refined`, or `ready` (not `in-progress` or `done`)
3. **Impact of the trigger** — what prompted this amendment and what it affects

### Phase 2: Amendment Proposal

Based on the amendment type, present options:

- **Insertions** — propose next sequential ID, updated edges (what it depends on, what depends on it), updated Mermaid diagram
- **Splits** — original task keeps one piece (same ID), new IDs for split-off pieces, updated edges
- **Removals** — task status → `skipped`, edges removed, downstream tasks re-linked
- **Resequencing** — before/after Mermaid diagrams, verify no cycles introduced
- **Scope updates** — diff of what changes in the request, impact on complexity estimate
- **Scope extensions** — new tasks needed, where they fit in the DAG

### Phase 3: Confirm Decisions

Summarize for approval:

- Tasks **added** (with IDs, names, complexity)
- Tasks **modified** (what changed)
- Tasks **removed/skipped**
- Updated **critical path**
- Impact on **in-progress work** (if any)
- **Jira actions needed** (tickets to create, update, or close)

### Phase 4: Apply (only when user confirms)

Update all affected files:

1. **`epic.md`** — update scope, status, or references as needed
2. **`task-graph.md`** — update:
   - `tasks:` array in frontmatter
   - Mermaid diagram
   - Add entry to `negotiations:` array with:
     - `trigger` — what caused the amendment
     - `type` — amendment type
     - `scope` — what was affected
     - `rationale` — why this approach was chosen
     - `decided_by` — all participants
3. **`delivery.yaml`** — update:
   - `nodes` (add/remove/modify)
   - `merge_order` groups
   - Add entry to `negotiation_impacts:` array
4. **New request files** — create in `requests/` for inserted tasks
5. **Existing request files** — update modified tasks
6. **Jira operations** (if MCP available):
   - Create tickets for new tasks
   - Update existing tickets for modified tasks
   - Close/cancel tickets for removed tasks
   - Update dependency links

## ID Rules

- **IDs are immutable** — once assigned, never changed
- **Next sequential** for new tasks (scan existing IDs, use max + 1)
- **Position determined by edges**, not by ID number
- Never reuse a skipped task's ID

## Constraints

- **Never modify `done` tasks** — they are historical record
- **Never change existing IDs** — breaks traceability
- **In-progress tasks** — only minor adjustments (acceptance criteria clarification, not scope changes)
- **Preserve negotiation audit trail** — every amendment is recorded
- **Re-estimate complexity** — amendment may change total effort
- **Epic status transitions** — `active` → `renegotiating` → `active` during amendment

## Entry Point

If the user doesn't specify which epic or what changed, ask for both:
1. Which epic is being amended? (Check `epics/active/` for epics with status `active` or `in-progress`)
2. What triggered the amendment? (Requirement change, design revision, technical discovery, etc.)
