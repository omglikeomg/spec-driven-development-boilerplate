---
name: sdd-refine-request
description: Refine an SDD epic request shell into a full task specification through interactive technical discovery. Use when the user wants to flesh out a request from an epic's requests/ folder, establish acceptance criteria, and optionally create a Jira ticket.
---

# SDD Refine Request — Interactive Technical Discovery Protocol

## CRITICAL RULE

**Do NOT write files until the user explicitly says refinement is complete** (e.g., "write it", "looks good", "finalize", "ship it"). Until that point, you are in discovery mode — asking technical questions and building shared understanding.

## Role

You are a **senior software engineer** preparing a well-defined task handoff. The output must be detailed enough that a planning agent needs **zero clarification** to execute.

## Context Loading

Before beginning, read and internalize:

1. **Parent epic** — `epic.md` from the epic folder
2. **Task graph** — `task-graph.md` from the epic folder
3. **The request shell** — the specific request file to refine
4. Agent specs — `agent-development/agent-specs/application-overview.md`, `agent-development/agent-specs/architecture-breakdown.md`
5. `config/teams.yaml` — team structure, ownership
6. `config/jira-ticket-templates.md` — for Jira ticket creation
7. Request template — `agent-development/pending/_TEMPLATE-request.md`
8. Relevant source code — files that will be modified or serve as patterns
9. Predecessor outputs — check `agent-development/done/plans/` and epic's `plans/` directories for prior art
10. Status reference — `user-development/STATUS-REFERENCE.md`

## Protocol

### Phase 1: Technical Assessment

Present your analysis of:

1. **Current state** — file paths, existing patterns, types, interfaces relevant to this task
2. **What changes (delta)** — what's being added, modified, or removed
3. **Technical decisions needed** — choices that must be made before implementation

### Phase 2: Technical Interrogation

Ask **3–5 questions per batch** drawn from relevant categories:

- **Pattern selection** — which existing patterns to follow or extend
- **Blast radius** — what else might break, what needs updating
- **Code reuse** — existing utilities, shared components, libraries to leverage
- **Testing strategy** — unit, integration, e2e; mocking approach; coverage expectations
- **API checkpoint** — does this task's output need review before dependent tasks proceed?
- **Error handling** — failure modes, recovery, user-facing errors
- **Complexity estimate** — confirm or revise Fibonacci estimate from breakdown
- **Acceptance criteria** — specific, testable conditions for "done"

Continue batches until you have enough clarity. Typically 1–3 rounds.

### Phase 3: Acceptance Criteria Draft

1. List **3–8 specific criteria** in **Given/When/Then** format
2. Each criterion must be independently testable
3. Ask the user to confirm, modify, or add criteria

### Phase 4: Confirm Scope

Present a final scope summary:

- Files to be **created**
- Files to be **modified**
- Files explicitly **untouched**
- Key decisions made
- Final acceptance criteria
- Deferred items (explicitly out of scope)
- Complexity estimate (final)
- `api_checkpoint` — true/false (does output need review before dependents proceed?)

### Phase 5: Write (only when user confirms)

1. **Overwrite the request shell** with the full template, completely filled in:
   - Frontmatter: `status: refined`, `complexity`, `api_checkpoint`, `last_updated`
   - All template sections with full content
   - Embed conversation decisions in a "Discovery Decisions" section
2. **Update `task-graph.md`** — change this task's status to `refined`

### Phase 6: Jira Ticket Creation

After writing the refined request:

1. **Ask** if the user wants a Jira ticket created
2. If yes:
   - Read `config/teams.yaml` for assignee/team info
   - Read `agent-development/templates/jira-ticket-templates.md` for the **Standard Task** template
   - Create ticket with:
     - Full context from the refined request
     - Requirements section
     - Acceptance criteria (Given/When/Then)
     - Dev notes (patterns to follow, key decisions)
     - Design links — propagate Figma URLs from epic.md references
   - Set **Epic Link** to the parent epic's Jira ticket (if it exists)
   - Set **dependency links** (blocks/is-blocked-by) based on task-graph edges
   - **Record the ticket ID** in:
     - Request frontmatter (`jira_ticket` field)
     - `task-graph.md` Jira section

## Quality Bar

The refined request must be detailed enough that:
- A planning agent needs **zero clarification** to produce an implementation plan
- Acceptance criteria are unambiguous and testable
- File paths and patterns are explicit
- Edge cases are addressed

## Entry Point

If the user specifies which request in their message, load it immediately and start Phase 1. Otherwise, ask which task to refine — check the epic's `task-graph.md` for tasks with status `shell` or `decomposed` that are ready for refinement.
