# Prompt: Plan a Task

> **Usage:** Copy this prompt into a new agent conversation. Point it at an activated request in `agent-development/pending/`. The agent produces a plan folder ready for human review.

---

## Input

**Task request to plan:** `agent-development/pending/<N-task-name.md>`

---

## Context to Read

Before planning, read and internalize:

1. **Agent specs** — all files in `agent-development/agent-specs/`
2. **Team config** — `config/teams.yaml`
3. **The task request** — the file specified above (including YAML frontmatter)
4. **Plan templates** — `agent-development/plans/_templates/manifest.yaml`, `specification.md`, `stage.md`
5. **Status reference** — `user-development/STATUS-REFERENCE.md`
6. **Relevant source code** — files/modules implied by the request's Implementation Details
7. **If part of an epic:** the epic's `epic.md`, `task-graph.md`, and `delivery.yaml`

---

## Your Task

Produce a complete plan folder. For epic tasks: create in the epic's `plans/` directory (e.g., `sdd/epics/active/N-epic-name/plans/<N-task-name>/`). For standalone tasks: create in `sdd/agent-development/plans/<N-task-name>/`.

After producing the plan, you must also:
1. **Create a feature branch** from `main` following the naming convention in `config/teams.yaml`
2. **Commit the plan folder** to the branch
3. **Push the branch and open a draft PR** using the `gh` CLI:
   ```bash
   gh pr create --draft --title "plan: <ticket-id> <short-description>" --body "Plan for review. See specification.md for details."
   ```

The folder must contain:

### 1. `manifest.yaml`

- Populate all fields from the template
- Set `plan_metadata.status: pending-approval`
- Set `plan_metadata.approval.status: pending`
- Set `plan_metadata.complexity` from the request's frontmatter
- Set `plan_metadata.api_checkpoint` from the request's frontmatter
- Define 2-5 stages with blast radius, verification commands, and rollback plans
- Per-stage `complexity` using Fibonacci scale
- Per-stage `api_checkpoint: true` if that stage changes observable API behavior
- For standalone tasks (no epic): fill the `delivery` section with planned branch name

### 2. `specification.md`

- Fill YAML frontmatter (plan_id, title, status: draft)
- Populate all body sections from the template
- Write thorough Open Questions for anything you cannot decide autonomously
- Include the File Manifest with all files across all stages
- Include API Checkpoint details in relevant stage summaries (the curl/GraphQL command and expected response shape — these are approved at plan time)

### 3. Stage instruction files

- One file per stage following `stage.md` template
- Include a commit plan (table of: commit message, files, purpose)
- Each stage should have **multiple commit units** if the work is decomposable
- Step-by-step instructions with file paths, code snippets, shell commands
- "Spec & doc review" steps in the last stage only (or inline for single-stage)

---

## Constraints

- Blast radius MUST stay within the request's stated scope
- If you find a missing dependency, write it as an Open Question (don't guess)
- Every `.ts` source change needs a corresponding test update or new test
- Prisma schema changes get their own stage
- Multiple commits per stage are expected — plan them explicitly in the commit table

---

## Output

Present each artifact as a code block with its file path as heading.
Ask me before saving any files.

After saving:
1. Create the branch, commit, push, and open the draft PR as described above.
2. Remind me:
> "Draft PR is open. Review `specification.md`, resolve any PENDING questions, then set `manifest.yaml` → `approval.status: approved` when ready to execute."
