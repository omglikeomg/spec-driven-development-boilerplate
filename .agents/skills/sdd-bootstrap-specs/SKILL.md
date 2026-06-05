---
name: sdd-bootstrap-specs
description: Bootstrap the agent-specs directory for a new SDD project. Use when the user wants to initialize or regenerate the five spec files that provide foundational context for all agent conversations. Reads existing source code and project description to generate accurate specs.
---

# SDD Bootstrap Specs

You are bootstrapping the **Spec-Driven Development (SDD)** workflow for a project. Your job is to generate the five `agent-specs/` files that provide foundational context for every future agent conversation.

## Identify the Project

The user should provide:
- A description of what the project does, who it's for, and what tech stack it uses
- Access to existing source code (if any) — read it to understand the real state

If the user hasn't provided a description, ask for one before proceeding.

## Context to Read (Before Generating)

1. **SDD boilerplate structure** — `user-development/DEVELOPMENT-GUIDE.md` for workflow context
2. **Existing spec files** — all files in `agent-development/agent-specs/` to understand the expected structure, heading hierarchy, and level of detail (these contain example content you will replace)
3. **Plan templates** — skim `agent-development/plans/_templates/` to understand how plans reference specs
4. **Project source code** — if the project has code, explore the directory tree, read key files (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, config files, entry points)
5. **Config files** — `config/commands.yaml` and `config/teams.yaml` (if they exist from bootstrap.sh)

## What You Will Generate

Create or overwrite these five files in `agent-development/agent-specs/`:

### 1. `application-overview.md`

What the app does, who it's for, core workflows, key UX/DX goals, out of scope.

- Replace example content entirely with project-specific content
- Keep heading structure: Purpose, Core Workflows, Key UX Goals, Out of Scope
- Be specific — vague overviews produce vague agent output

### 2. `architecture-breakdown.md`

Directory tree, folder descriptions, module dependencies, design patterns, tech stack, key decisions.

- If existing code: generate tree from **actual** file structure
- If greenfield: generate **proposed** tree, clearly marked as proposed
- Keep heading structure: Directory Tree, Folder Descriptions, Module Dependency Graph, Design Patterns, Technology Stack, Key Architectural Decisions, Key Conventions
- Include `agent-development/` and `user-development/` directories

### 3. `agent-instructions.md`

Coding standards, dos/don'ts, error handling, testing, naming conventions, stack-specific rules.

- This is a starting point the developer will tweak over time
- Replace content with rules appropriate to the project's language and framework
- Keep sensible defaults (strict typing, proper logging, etc.)
- Add framework-specific rules
- Reference `bin/dev` commands (not raw package manager commands) if commands.yaml exists

### 4. `agent-workflow.md`

Execution rules — how agents interact with plans, stages, blast radius, commits.

- This file is **system-level** and typically does NOT need customization
- **Copy as-is** unless the project explicitly needs workflow changes
- Confirm it is unchanged and skip if the content is already correct

### 5. `git-workflow.md`

Branching strategy, commit conventions, ticket ID pattern, versioning.

- Update ticket ID regex if the developer specifies their issue tracker format
- Update branch naming examples to match the project
- If no git preferences specified, keep the defaults

## Rules

1. Generate all five files (or confirm `agent-workflow.md` is unchanged)
2. Match the level of detail shown in the example files — agents need explicit, specific content
3. Be accurate — if you read source code, specs must reflect actual state
4. Preserve heading structure — other files reference these by heading
5. Do NOT generate plans, requests, or any code
6. Do NOT delete example files in `agent-development/done/`
7. Do NOT modify any files outside `agent-development/agent-specs/`

## After Generation

Provide a summary:

- 📄 Files created/updated (one-line description each)
- ⚠️ Anything you were unsure about or had to guess
- 🔜 Recommended next steps: review specs, then start your first task — describe what you want to build in a fresh session and `sdd-create-request` will guide you
