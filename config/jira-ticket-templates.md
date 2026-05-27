# Jira Ticket Templates for SDD Tasks

> **Location:** `config/jira-ticket-templates.md`  
> **Used by:** Prompt 7 (Refine Request), Prompt 11 (Amend Epic)  
> **Purpose:** Defines the minimum content standard for Jira tickets created from SDD tasks.

---

## When to Use Which Template

| Moment | Template | Trigger |
|--------|----------|---------|
| After task refinement (Prompt 7) | **Standard Task Ticket** | Task status moves to `refined` |
| After plan approval | **Enriched Ticket** (optional) | Plan status moves to `approved` |
| Experiment-related task | **Experiment Task Ticket** | Task involves A/B test infrastructure |

---

## Standard Task Ticket

Use this template when creating Jira tickets after a task has been refined (Prompt 7). This is the **minimum content bar** — every ticket must have at least this level of detail.

### Title

```
[Verb] [Object] — [Context]
```

Examples:
- "Create vendorAwardsAtom data layer"
- "Migrate BestOfWeddingsExpandedBadge to atom pattern"
- "Register awards enhancement experiment in Flipper"

### Description

```markdown
## Context

- **Epic:** [PROJ-XXX] <Epic Title>
- **Task:** N of M in epic task graph
- **Target repo:** <repo-name> (from config/repos.yaml)
- **Depends on:** [PROJ-YYY], [PROJ-ZZZ] (or "None — independent")
- **Blocks:** [PROJ-AAA] (or "None")
- **Cross-repo deps:** [Describe any cross-repo dependency]

## Product Brief

- [Link to PRD/Confluence page]

## Design

- **Figma:** [URL]
- **Notes:** [Any design-specific notes]

## Goal

<!-- What does "done" look like for this task? 1-2 sentences. -->

## Requirements

- **R1.** [First concrete requirement]
- **R2.** [Second concrete requirement]
- **R3.** [Third concrete requirement]

## Acceptance Criteria

- [ ] [Scenario 1: Given X, When Y, Then Z]
- [ ] [Scenario 2: Given X, When Y, Then Z]
- [ ] [Scenario 3: Given X, When Y, Then Z]

## Dev Notes

- **Target repo:** <repo-name>
- **New component?** Yes / No
- **Modifies existing component?** Yes / No — [which one]
- **Key files:** [paths to primary files affected]
- **Pattern to follow:** [reference to existing pattern in codebase]

## Cross-Team Information

- **Impacted teams:** [Team names and contacts, or "None"]
- **API endpoints:** [Endpoints affected, or "N/A"]
- **External repos:** [Other repos involved, or "N/A"]
- **Contracts:** [Reference to contracts/ file if applicable]

## Resources

- [Link to SDD request file in hub repo]
- [Link to epic.md]
- [Any other relevant links]
```

---

## Experiment Task Ticket

Use this **in addition to** the Standard template when the task involves A/B test experiment infrastructure.

### Additional Sections (append after Dev Notes)

```markdown
## A/B Test Experiment

**Experiment Name:** [Name as registered in experimentation platform]

### Variants and Allocations

| Variant | Description | Allocation |
|---------|-------------|------------|
| Control | [Description] | XX% |
| Variant 1 | [Description] | XX% |
| Variant 2 | [Description] | XX% |

### Experiment URLs

**QA:**
- Flipper URL: [URL]
- Flipper ID: [ID]
- Control: `https://qa-beta.theknot.com?vers=0`
- Variant 1: `https://qa-beta.theknot.com?vers=1`
- Variant 2: `https://qa-beta.theknot.com?vers=2`

**PROD:**
- Flipper URL: [URL]
- Flipper ID: [ID]
- Control: `www.theknot.com?vers=0`
- Variant 1: `www.theknot.com?vers=1`
- Variant 2: `www.theknot.com?vers=2`

### Important Experiment Notes

- [Any critical notes about experiment setup, duration, metrics]
```

---

## Enriched Ticket (Optional)

After a plan is approved, optionally update the ticket with implementation-level detail.

### Additional Sections (append to existing ticket)

```markdown
## Implementation Plan Summary

- **Total stages:** N
- **Estimated LOC:** ~XXX
- **Key decisions:**
  - [Decision 1 and rationale]
  - [Decision 2 and rationale]

## QA Testing Notes

- [How to verify this task works correctly]
- [Specific test scenarios to run]
- [Environment setup needed]

## Edge Cases Handled

- [Edge case 1 and how it's handled]
- [Edge case 2 and how it's handled]
```

---

## Guidelines

1. **Acceptance Criteria are mandatory** — Every ticket must have at least 3 concrete, verifiable acceptance criteria.
2. **Link dependencies as Jira issue links** — Use "Blocks" / "Is Blocked By" relationships.
3. **Keep the Description self-contained** — A developer should be able to understand the task without opening the SDD request file.
4. **Use consistent verb prefixes** in titles: Create, Migrate, Register, Add, Remove, Refactor, Fix, Update.
5. **Tag with epic** — Always set the Epic Link field in Jira to the parent epic ticket.
6. **Include target repo** — Always specify which repo the task executes in.
