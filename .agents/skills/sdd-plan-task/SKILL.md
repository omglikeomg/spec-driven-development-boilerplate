---
name: sdd-plan-task
description: Plan an activated SDD task request. Use when the user wants to create an implementation plan from a request file in pending/ or an epic's requests/ folder. Produces a plan folder with manifest, specification, and stage files, then creates a branch and opens a draft PR.
---

# Plan an SDD Task

You are creating an implementation plan from an activated task request. Your output is a plan folder ready for human review, a feature branch, and a draft PR.

---

## Identify the Request

If the user specified which request to plan, use that file. If not, check `agent-development/pending/` for activated requests and ask the user which one to plan.

---

## Context to Read (Before Planning)

Before producing any output, silently read and internalize:

1. **Agent specs** — all files in `agent-development/agent-specs/`
2. **Team config** — `config/teams.yaml`
3. **The task request** — the specified file in `agent-development/pending/` (including YAML frontmatter)
4. **Plan templates** — `agent-development/plans/_templates/manifest.yaml`, `specification.md`, `stage.md`
5. **Status reference** — `user-development/STATUS-REFERENCE.md`
6. **Relevant source code** — files/modules implied by the request's Implementation Details
7. **If part of an epic:** the epic's `epic.md`, `task-graph.md`, and `delivery.yaml`

---

## Output Location

- **Epic tasks:** create in the epic's plans directory (e.g., `epics/active/N-epic-name/plans/<N-task-name>/`)
- **Standalone tasks:** create in `agent-development/plans/<N-task-name>/`

---

## Plan Artifacts to Produce

### 1. `manifest.yaml`

- Populate all fields from the template in `agent-development/plans/_templates/manifest.yaml`
- Set `plan_metadata.status: pending-approval`
- Set `plan_metadata.approval.status: pending`
- Set `plan_metadata.complexity` from the request's frontmatter
- Set `plan_metadata.api_checkpoint` from the request's frontmatter
- Define 2–5 stages with blast radius, verification commands, and rollback plans
- Per-stage `complexity` using Fibonacci scale (1, 2, 3, 5, 8, 13)
- Per-stage `api_checkpoint: true` if that stage changes observable API behavior
- For standalone tasks (no epic): fill the `delivery` section with the planned branch name

### 2. `specification.md`

- Fill YAML frontmatter (plan_id, title, status: draft)
- Populate all body sections from the template in `agent-development/plans/_templates/specification.md`
- Write thorough Open Questions for anything you cannot decide autonomously
- Include the File Manifest with all files across all stages
- Include API Checkpoint details in relevant stage summaries (the curl/GraphQL command and expected response shape — these are approved at plan time)

### 3. Stage Instruction Files

- One file per stage following the `agent-development/plans/_templates/stage.md` template
- Include a **commit plan table** with columns: commit message, files, purpose
- Each stage should have **multiple commit units** if the work is decomposable
- Step-by-step instructions with file paths, code snippets, shell commands
- "Spec & doc review" steps in the last stage only (or inline for single-stage plans)

---

## Constraints

- Blast radius MUST stay within the request's stated scope
- If you find a missing dependency, write it as an Open Question — do NOT guess
- Every `.ts` source change needs a corresponding test update or new test
- Prisma schema changes get their own stage
- Multiple commits per stage are expected — plan them explicitly in the commit table

---

## Presentation

Present each artifact as a code block with its file path as heading. Ask the user before saving any files.

---

## After Saving the Plan

Once the user confirms and you save the files:

1. **Create a feature branch** from the base branch specified in `config/teams.yaml`, following the branch naming format defined there (e.g., `feat/<ticket-id>-<short-description>`)
2. **Commit the plan folder** to the branch
3. **Push the branch and open a draft PR:**
   ```bash
   gh pr create --draft --title "plan: <ticket-id> <short-description>" --body "Plan for review. See specification.md for details."
   ```
4. **Remind the user:**
   > "Draft PR is open. Review `specification.md`, resolve any PENDING questions, then set `manifest.yaml` → `approval.status: approved` when ready to execute."
