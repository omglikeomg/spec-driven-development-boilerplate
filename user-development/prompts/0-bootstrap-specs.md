# Prompt: Bootstrap Project Specs

> **Usage:** Copy this prompt into a new agent conversation when adopting the SDD boilerplate for a new project. Replace `<PROJECT_DESCRIPTION>` with a description of your project — what it does, who it's for, tech stack, and key architectural decisions. If you have an existing codebase, point the agent at the source tree too.

---

You are bootstrapping the **Spec-Driven Development (SDD)** workflow for a new project. Generate the five `agent-specs/` files that provide foundational context for every future agent conversation.

## Before Starting

1. **Read the SDD boilerplate structure:**
   - `user-development/DEVELOPMENT-GUIDE.md` — full workflow documentation
   - `agent-development/agent-specs/` — read ALL existing files to understand the expected structure, heading hierarchy, and level of detail (these contain example content you will replace)
   - `agent-development/plans/_templates/` — skim to understand how plans reference the spec files

2. **Read the project's existing source code** (if any). Explore the directory tree, read key files (`package.json`, `go.mod`, config files, entry points, etc.). The source code is the source of truth — specs must reflect what exists, not what the developer wishes existed.

3. **Read the project description:**

**→ `<PROJECT_DESCRIPTION>`**

## What You Will Generate

Create or overwrite five files in `agent-development/agent-specs/`. For each file, **preserve the same heading structure** as the existing example but replace the content with the actual project's details.

### 1. `application-overview.md`

What the app does, who it's for, core workflows, key UX/DX goals, out of scope. Replace the `THIS IS AN EXAMPLE` banner with a bootstrap banner. Be specific — vague overviews produce vague agent output.

### 2. `architecture-breakdown.md`

Directory tree, folder descriptions, module dependency graph, design patterns, technology stack, key architectural decisions, conventions. Generate the tree from **actual** file structure if a codebase exists; mark as **proposed** for greenfield projects. Include the `agent-development/` and `user-development/` directories.

### 3. `agent-instructions.md`

Coding standards, dos/don'ts, error handling, testing, naming conventions, stack-specific rules. This is a **starting point** the developer will tweak — keep the `THIS IS A STARTING POINT` banner and `👆 TWEAK THIS` comment banners. Replace framework-specific sections to match the actual tech stack. Keep the "Relationship to Other Spec Files" table.

### 4. `agent-workflow.md`

This file is **system-level** and typically does NOT need customization. **Copy it as-is** unless the project description explicitly calls for workflow changes. Confirm it is unchanged and skip.

### 5. `git-workflow.md`

Branching strategy, commit conventions, ticket ID pattern, versioning. Keep the `TWEAK THIS` banners. Update the ticket ID regex and branch naming examples if the developer specifies their issue tracker format. Otherwise keep defaults.

## Rules

1. Generate all five files (or confirm `agent-workflow.md` is unchanged).
2. Match the **level of detail** in the example files — agents perform better with specific content.
3. Be accurate — if you read source code, specs must reflect actual state. Mark proposed structure as proposed for greenfield projects.
4. Preserve heading structure — other SDD files reference these by heading.
5. Do NOT generate plans, requests, or code. Do NOT delete files in `agent-development/done/`. Do NOT modify files outside `agent-development/agent-specs/`.

## After Generation

Provide a summary:

- 📄 Files created or updated (one-line description each)
- ⚠️ Anything you were unsure about or guessed (developer should review)
- 🔜 Recommended next steps (typically: review specs, delete example pending requests if they don't match your stack, then create your first task request via `user-development/prompts/3-request-feature.md`)