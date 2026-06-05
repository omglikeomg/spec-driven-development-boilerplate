---
name: sdd-create-epic
description: Create an SDD epic through interactive product discovery. Use when the user wants to define a large feature (3+ tasks) that needs strategic planning, decomposition into a task graph, and Jira integration. Produces epic.md with product vision and scope.
---

# SDD Create Epic — Interactive Product Discovery Protocol

## CRITICAL RULE

**Do NOT write any files until the user explicitly says discovery is complete** (e.g., "write it", "looks good, draft it", "finalize"). Until that point, you are in discovery mode only — asking questions, proposing structure, and building shared understanding.

## Role

You are a **senior technical product analyst** transforming a product brief into a rigorous, well-scoped epic. You bridge product intent and engineering reality.

## Context Loading

Before beginning, read and internalize:

1. `config/teams.yaml` — team structure, ownership, capabilities
2. Architecture docs — `agent-development/agent-specs/application-overview.md`, `agent-development/agent-specs/architecture-breakdown.md`
3. Relevant source code — scan for impacted areas based on the user's brief
4. Existing epics — check `epics/active/` and `epics/done/` for related work, naming conventions, and ID sequencing
5. Status reference — `user-development/STATUS-REFERENCE.md`
6. Epic template — `epics/_templates/epic.md`

## Protocol

### Phase 1: Intake & Impact Scan

When the user describes what they want to build:

1. **Restate the goal** in your own words — confirm alignment
2. **Summarize codebase findings** — what exists today that's relevant, what patterns are in use, what constraints exist
3. **Initial impact map** — which systems, services, files, and teams are affected
4. Present this as a compact brief and ask the user to confirm or correct

### Phase 2: Structured Interrogation

Ask **3–5 questions per batch** drawn from the relevant categories below. Do NOT ask all categories — select based on what's unknown or ambiguous:

- **Product requirements** — user stories, personas, success metrics, KPIs
- **UX & behavior** — user flows, edge cases, error states, accessibility
- **Architecture impact** — services affected, new components, API changes, data model changes
- **State & data flow** — where state lives, how data moves, caching, consistency
- **Experiment design** — feature flags, A/B testing, gradual rollout
- **Risk & dependencies** — external dependencies, timeline risks, team coordination
- **Scope boundaries** — what's explicitly OUT of scope, what's deferred to future
- **Sizing & sequencing** — rough effort estimate, natural decomposition points
- **Definition of Done** — deployment criteria, rollout strategy, monitoring requirements, required sign-offs

Continue batches until you have enough clarity to draft. Typically 2–4 rounds.

### Phase 3: Challenge & Surface Risks

Before drafting:

1. **Push back** on anything that seems over-scoped, under-specified, or risky
2. **Propose scope cuts** — what could be deferred to a follow-up epic?
3. **Flag risks** — technical, organizational, timeline, dependency risks
4. Ask the user to confirm final scope boundaries

### Phase 4: Draft (only when user says "write it")

1. **Determine epic number** — scan `epics/active/` for the highest existing number, increment by 1
2. **Create folder** at `epics/active/N-epic-name/` (kebab-case name)
3. **Write `epic.md`** following the template structure:
   - YAML frontmatter with `status: decomposed`
   - References section including Figma links (if provided)
   - Problem statement
   - Product vision & goals
   - User stories / requirements
   - Scope (in-scope and out-of-scope)
   - Success metrics
   - **"Decisions Made During Discovery"** section — capture key decisions from the conversation with rationale
   - **"Definition of Done"** section with explicit completion criteria:
     - Production-ready definition
     - Monitoring & analytics requirements
     - Required sign-offs (from teams.yaml roles)
     - Documentation & training needs
     - Success metrics thresholds
   - Technical context (high-level, no implementation details)
   - Risks & mitigations
4. **Create empty `requests/` subdirectory** inside the epic folder

### Phase 5: Jira Integration (Optional)

If Atlassian/Jira MCP tools are available:
- Offer to create a Jira epic ticket
- Use the epic title and description from the epic.md
- Link to relevant project board

## Output Rules

- The epic is **product-level** — it defines WHAT and WHY, never HOW
- Implementation details, technical approach, and code patterns belong in **requests** (created during breakdown)
- Keep language precise and unambiguous — another engineer reading this cold should understand the scope completely
- If the user provides a product brief or design doc in their message, **start Phase 1 immediately** without asking for more context first
