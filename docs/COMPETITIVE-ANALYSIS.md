# Competitive Analysis - Spec Kit, OpenSpec, and Gentle-AI

> **Audience:** CTO, VP Engineering, Platform Director
> **Date:** June 2026

---

## Overview

This analysis focuses on three current projects that can teach the SDD Multirepo Hub useful patterns:

- **Spec Kit** - the most complete spec-driven development toolkit in the set.
- **OpenSpec** - a lighter, brownfield-first planning layer that treats specs as living repo artifacts.
- **Gentle-AI** - an ecosystem configurator for AI coding agents, with memory, orchestration, and per-phase model routing.

The key question is not "which tool writes code best?" It is "what can we learn from each tool, and what should we keep unique in the Hub?"

| Tool | Primary layer | Core idea |
|---|---|---|
| Spec Kit | Spec workflow standard | Spec -> Plan -> Tasks -> Implement, with rich templates and governance |
| OpenSpec | Lightweight planning layer | Actions, not phases; specs live in code and evolve with the repo |
| Gentle-AI | Agent operating system | Make any agent smarter with memory, skills, SDD workflows, and routing |

The Hub still differentiates on **cross-repo execution, state sync, and git-flows**. None of these projects fully replaces that. The best framing is to borrow their strongest ideas while keeping the Hub's delivery model intact.

---

## 1. Spec Kit

### What it is

Spec Kit is the most mature open-source SDD toolkit in this comparison. Its documented flow is **Spec -> Plan -> Tasks -> Implement**, backed by a CLI, templates, integrations, extensions, presets, and a docs site.

Latest docs reviewed:
- https://github.com/github/spec-kit
- https://github.github.io/spec-kit/

### What stands out

- 30+ AI coding agent integrations.
- 105 community extensions and 22 presets, with project-local overrides.
- Quality checklists and cross-artifact analysis are first-class.
- Works offline and is positioned for enterprise use.
- Strong command surface: constitution, specify, plan, tasks, implement, clarify, checklist, analyze.

### Strengths vs the Hub

- Best-in-class **single-repo SDD rigor**.
- Stronger **template ecosystem** than the Hub.
- Better **governance and customization** story than the Hub's hard-coded workflow.
- Broader **agent compatibility** than the Hub's execution model.

### Where the Hub still wins

- Native **cross-repo task graph** and delivery tracking.
- PR/branch/state synchronization across independent repos.
- Workflow-level audit trail for distributed delivery.
- Hub-specific enterprise controls around dispatch, integrity, and sync.

### What we can learn

- Borrow its spec rigor, checklist generation, and artifact chain.
- Use its conventions as a blueprint for a stronger under-the-hood spec engine.
- Keep the Hub's multi-repo dispatch, delivery tracking, and git-flows as the product edge.

### Bottom line

Spec Kit is the best candidate for an internal implementation model, but not for replacing the Hub experience. We can use it under the hood while keeping Hub git-flows and cross-repo coordination as the user-facing system.

---

## 2. OpenSpec

### What it is

OpenSpec is a lighter planning framework built around reusable artifacts in the repo. Its current docs emphasize **actions, not phases**, and a **brownfield-first** approach.

Latest docs reviewed:
- https://github.com/Fission-AI/OpenSpec
- https://openspec.dev/
- https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md

### What stands out

- Specs live in the codebase and are checked in.
- Planning is intended to span multiple sessions.
- Workflow is intentionally fluid: proposal, specs, design, tasks, implement.
- It is explicitly optimized for mature codebases and iterative change.
- The docs stress collaboration through git and PRs rather than a heavy process layer.

### Strengths vs the Hub

- Lower ceremony than the Hub.
- Better fit for **brownfield refactoring** and long-lived workspaces.
- Stronger emphasis on **team collaboration inside the repo**.
- Easier to understand for users who want a planning layer, not an orchestration platform.

### Where the Hub still wins

- Multi-repo execution and synchronized delivery state.
- Stronger change-control model with dispatch, readiness, and completion tracking.
- More explicit guardrails around PR lifecycle and cross-repo dependencies.

### What we can learn

- Keep planning lightweight and brownfield-first.
- Preserve specs in the repo as living artifacts.
- Avoid making the Hub feel like a heavy ceremony engine.

### Bottom line

OpenSpec is a useful design signal for reducing friction. The Hub can adopt that mindset without giving up its coordination layer.

---

## 3. Gentle-AI

### What it is

Gentle-AI is not really a spec framework. It is an **ecosystem configurator** for AI coding agents: memory, workflow orchestration, MCP tooling, persona/safety controls, and per-phase model routing.

Latest docs reviewed:
- https://github.com/Gentleman-Programming/gentle-ai

### What stands out

- Supports a wide set of agents and modes.
- Persistent memory via Engram.
- SDD-oriented workflows and skills.
- Per-phase model assignment for planning and implementation.
- Strong operational layer: install, sync, backup, rollback, profile management, and health checks.

### Strengths vs the Hub

- Best **agent-ops** story in the set.
- Strongest **memory and personalization** story.
- More flexible for teams that want to standardize agent behavior across tools.
- Good fit when the goal is to make the agent environment itself dependable.

### Where the Hub still wins

- Actual cross-repo delivery coordination.
- Concrete spec/planning artifact model tied to PRs and releases.
- Delivery-state synchronization and auditability across repositories.

### What we can learn

- Treat agents as configurable runtime environments, not fixed chatbots.
- Add memory, phase-aware routing, and operational safety where it helps.
- Interoperate with agent ecosystems instead of trying to own them.

### Bottom line

Gentle-AI is a model for the agent layer, not the workflow layer. The Hub can borrow ideas from it while keeping the git-flow and delivery model separate.

---

## Comparison by axis

| Axis | Hub | Spec Kit | OpenSpec | Gentle-AI |
|---|---|---|---|---|
| SDD rigor | Strong | Strongest | Moderate | Indirect |
| Brownfield fit | Strong | Good | Strongest | Good |
| Cross-repo coordination | Strongest | None | Weak / emerging | None |
| Customization | Good | Strongest | Moderate | Strong |
| Agent portability | Good | Strong | Strong | Strongest |
| Memory / continuity | Moderate | Low | Moderate | Strongest |
| Enterprise governance | Strong | Strong | Moderate | Moderate |

---

## What to discard

The earlier broader list can be trimmed.

- **Engram** is better treated as a dependency or subcomponent inside Gentle-AI, not a standalone competitor here.
- **obra/superpowers** do not currently add enough direct signal to the SDD + planning-layer comparison to keep in the main analysis.

---

## Recommendations for the Hub

1. **Use Spec Kit ideas under the hood.** Borrow the spec/plan/task rigor, checklist quality, and artifact structure.
2. **Keep Hub git-flows intact.** The user-facing experience should stay centered on dispatch, branch/PR tracking, and delivery-state sync.
3. **Steal OpenSpec's lightness.** Reduce ceremony where possible so the Hub feels like a workflow accelerator, not a process tax.
4. **Adopt agent-ops selectively.** Memory, persona, and routing are useful, but only where they improve execution without blurring ownership.
5. **Differentiate on coordination.** If the ecosystem converges, the Hub moat should stay anchored in auditability, state sync, and multi-repo delivery.

---

## Competitive position summary

The Hub is not trying to out-spec Spec Kit or out-minimize OpenSpec. It should be the **coordination layer** that can borrow from them under the hood while keeping its own git-flows:

- Spec Kit = strongest spec engine
- OpenSpec = lightest planning layer
- Gentle-AI = strongest agent environment
- Hub = strongest multi-repo delivery system

That is a defensible position if the product keeps deepening cross-repo execution, state sync, and auditability.

---

## Source notes

Latest documentation reviewed for this refresh:

- Spec Kit README and docs site
- OpenSpec README, docs site, and workflows guide
- Gentle-AI README
