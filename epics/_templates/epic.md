---
# ─────────────────────────────────────────────────────────────────────────────
# Epic Metadata (machine-parseable)
# ─────────────────────────────────────────────────────────────────────────────
id: null              # Sequential number (e.g., 1, 2, 3)
title: ""
status: draft         # draft | discussing | decomposed | active | paused | renegotiating | delivered | done | abandoned
complexity: null      # Fibonacci: 1 | 2 | 3 | 5 | 8 | 13 — overall epic sizing
created: null         # YYYY-MM-DD
last_updated: null    # YYYY-MM-DD
owner: ""             # Human responsible (Product Owner / Tech Lead)

# Jira integration
jira_epic: null       # e.g., PROJ-100 (created after epic is confirmed)

# Approval tracking (replaces folder-based approval)
approval:
  approved_by: null
  approved_at: null   # YYYY-MM-DD
  # If status changes to 'renegotiating', previous approval is void until re-approved

# References (agents MUST read linked docs during epic conversation and task planning)
references:
  confluence: []      # Confluence page URLs (PRDs, specs, research)
  figma: []           # Figma design URLs
  other: []           # Any other relevant links (Jira, Notion, Loom, Slack threads)
---

# Epic: <EPIC_NAME>

## Problem Statement

_Why does this work need to exist? What user or business problem are we solving? Why now?_

## Product Vision

_What does the world look like when this is done? Describe the end-state from the user's perspective._

## Requirements

_Numbered product requirements. These are outcomes, not implementation details._

- **R1.** ...
- **R2.** ...
- **R3.** ...

## Success Criteria

_How do we know this is done and working? Measurable where possible._

- [ ] ...
- [ ] ...

## Scope Boundaries

### In Scope

- ...

### Out of Scope

- ...

## Technical Constraints

_Anything the breakdown/implementation must respect — existing patterns, data requirements, migration concerns, performance budgets, etc. This section is informed by the discovery session._

- ...

## Experiment Design (if applicable)

_Remove this section entirely if no experiment is involved._

| Variant | Description | Allocation |
|---|---|---|
| Control | ... | ...% |
| Variant B | ... | ...% |

**Hypothesis:** ...
**Primary metric:** ...
**Duration:** ...
**Cleanup plan:** ...

## Decisions Made During Discovery

_Key decisions from the interactive discovery session (Prompt 5). These provide context for why certain approaches were chosen._

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | ... | ... | ... |

## Definition of Done

_Established during epic creation (Prompt 5). Defines what "done" means for the entire epic — beyond individual task completion._

- [ ] **Deployment:** [Feature flags removed / staged rollout complete / fully launched]
- [ ] **Monitoring:** [Alerts configured / dashboards created / error rate baseline confirmed]
- [ ] **Sign-offs:** [QA regression pass / PM acceptance / stakeholder demo]
- [ ] **Documentation:** [User docs updated / training materials delivered / runbook created]
- [ ] **Success metrics:** [Metric X meets threshold Y within Z time period]

_Adjust or remove criteria that don't apply. Add project-specific criteria as needed._

## References

- _Links to designs, PRDs, Slack threads, related epics, etc._
