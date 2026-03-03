# Implementation Plan: Task 0 — Project Bootstrapping & Workspace Setup

## Overview

This plan bootstraps the entire project from zero: initializing a NestJS TypeScript application, creating the full directory hierarchy, wiring up Docker for local development, and establishing configuration, linting, and testing foundations. After execution, the project should compile, pass an empty test suite, and spin up via `docker compose up`.

This is a multi-stage plan because the bootstrapping task touches every layer of the project simultaneously (dependencies, source scaffold, Docker, config, docs). Breaking it into stages keeps each unit of work focused and independently verifiable.

---

## Reference Documents

Before starting, the implementing agent **must** read and internalize these files:

| Document | Path | Purpose |
|---|---|---|
| Application Overview | `agent-development/agent-specs/application-overview.md` | Understand what the tool does |
| Architecture Breakdown | `agent-development/agent-specs/architecture-breakdown.md` | Understand folder structure, design patterns, tech stack |
| Agent Instructions | `agent-development/agent-specs/agent-instructions.md` | Coding standards, dos/don'ts, workflow |
| Folder Structure | `agent-development/agent-specs/FOLDER-STRUCTURE.md` | Quick-reference project directory tree and module dependency graph |
| Task Definition | `agent-development/pending/0-project-bootstrapping.md` | The task being implemented |

---

## Pre-Conditions

- Node.js 20 LTS is installed and on `$PATH`.
- Yarn (v1 classic) is installed.
- Docker and Docker Compose are installed and the Docker daemon is running.
- No existing `package.json` or `node_modules/` in the project root (clean start).

---

## Stages

### Stage 1: Project Initialization & TypeScript Config

**Complexity:** medium
**Instruction file:** `1-project-initialization.md`

Initialize the Node.js project with `yarn init`, install all core NestJS dependencies and dev tooling, and create `tsconfig.json` (strict mode), `tsconfig.build.json`, and `nest-cli.json`.

**Reads:** `agent-development/agent-specs/architecture-breakdown.md`, `agent-development/agent-specs/FOLDER-STRUCTURE.md`
**Writes:** `package.json`, `yarn.lock`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`

---

### Stage 2: Directory Structure & Source Placeholders

**Complexity:** large
**Instruction file:** `2-directory-structure.md`

Create the full directory hierarchy from `FOLDER-STRUCTURE.md` and populate every module with minimal placeholder files (module, controller, service, entity, DTO) that compile without errors. This includes `src/main.ts`, `src/app.module.ts`, all feature modules, the config module, the database module, common utilities, and the OpenLibrary client module.

**Reads:** `agent-development/agent-specs/FOLDER-STRUCTURE.md`, `package.json`, `tsconfig.json`
**Writes:** `src/main.ts`, `src/app.module.ts`, `src/config/*`, `src/database/*`, `src/books/*`, `src/shelves/*`, `src/reading-sessions/*`, `src/recommendations/*`, `src/external/open-library/*`, `src/common/**/*`

---

### Stage 3: Docker, Environment & Makefile

**Complexity:** medium
**Instruction file:** `3-docker-env-makefile.md`

Create the Dockerfile (multi-stage build), `docker-compose.yml` (app + MongoDB + Redis with configurable ports and health checks), `.env.example`, `.gitignore`, `Makefile` with `up`/`down`/`build`/`test`/`lint` targets, and Jest e2e configuration.

**Reads:** `src/config/configuration.ts`, `package.json`
**Writes:** `.env.example`, `.gitignore`, `Makefile`, `docker/Dockerfile`, `docker/docker-compose.yml`, `test/jest-e2e.json`

---

### Stage 4: Spec Updates

**Complexity:** small
**Instruction file:** `4-spec-updates.md`

Update `agent-development/agent-specs/architecture-breakdown.md` to reflect the actual installed dependencies and module wiring. Update `agent-development/agent-specs/FOLDER-STRUCTURE.md` to match the directory tree that was actually created (in case any adjustments were made during Stage 2).

**Reads:** `package.json`, `src/app.module.ts`, current spec files
**Writes:** `agent-development/agent-specs/architecture-breakdown.md`, `agent-development/agent-specs/FOLDER-STRUCTURE.md`

---

### Stage 5: Documentation Updates

**Complexity:** small
**Instruction file:** `5-documentation-updates.md`

Update `README.md` with the project title, purpose, prerequisites, installation steps (`yarn install`, `cp .env.example .env`), development workflow (referencing the Makefile), and a quick-start section. Ensure the README references the correct Docker and config file paths.

**Reads:** `README.md`, `Makefile`, `.env.example`
**Writes:** `README.md`

---

## Open Questions & Decisions

### Q1: Package manager — Yarn Classic (v1) or Yarn Berry (v4)?

**Context:** Yarn v1 is widely understood and has near-zero config. Yarn v4 (Berry) supports Plug'n'Play and stricter dependency resolution but has a steeper learning curve and some NestJS tooling doesn't work perfectly with PnP.

**Options:**
- **A)** Yarn Classic (v1) — simpler, universally compatible, `node_modules` based.
- **B)** Yarn Berry (v4) with `nodeLinker: node-modules` — modern Yarn but still uses `node_modules` for compatibility.

**Agent's recommendation:** A (Yarn Classic) — maximum compatibility with NestJS ecosystem, zero friction.

**Human decision:** A — agreed, let's keep it simple.

---

### Q2: Should `docker-compose.yml` live in the project root or a `docker/` subdirectory?

**Context:** Root placement is the Docker convention and simplifies `docker compose up` invocations. Subdirectory placement keeps the root cleaner but requires `-f docker/docker-compose.yml` on every command (mitigated by the Makefile).

**Options:**
- **A)** Root — conventional, zero-config `docker compose up`.
- **B)** `docker/` subdirectory — cleaner root, Makefile abstracts the path anyway.

**Agent's recommendation:** B (`docker/` subdirectory) — the Makefile handles the path, and the root stays uncluttered.

**Human decision:** B — the Makefile is the primary interface anyway. Keep the root clean.

---

## File Manifest

Summary of every file created or modified across all stages of this plan:

| # | File Path | Action | Stage | Content Summary |
|---|---|---|---|---|
| 1 | `package.json` | Created | 1 | Project metadata, dependencies, scripts |
| 2 | `tsconfig.json` | Created | 1 | TypeScript strict mode config |
| 3 | `tsconfig.build.json` | Created | 1 | Build-specific TS config (excludes tests) |
| 4 | `nest-cli.json` | Created | 1 | NestJS CLI configuration |
| 5 | `src/main.ts` | Created | 2 | App bootstrap: validation pipe, config-driven port |
| 6 | `src/app.module.ts` | Created | 2 | Root module: imports all feature modules |
| 7 | `src/config/configuration.ts` | Created | 2 | Config factory reading from `process.env` |
| 8 | `src/config/config.module.ts` | Created | 2 | Config module with Joi validation |
| 9 | `src/database/database.module.ts` | Created | 2 | Mongoose async module config |
| 10 | `src/books/books.module.ts` | Created | 2 | Books feature module |
| 11 | `src/books/books.controller.ts` | Created | 2 | Books REST controller (placeholder) |
| 12 | `src/books/books.service.ts` | Created | 2 | Books service (placeholder) |
| 13 | `src/books/entities/book.entity.ts` | Created | 2 | Book entity (placeholder) |
| 14 | `src/shelves/shelves.module.ts` | Created | 2 | Shelves feature module |
| 15 | `src/shelves/shelves.controller.ts` | Created | 2 | Shelves controller (placeholder) |
| 16 | `src/shelves/shelves.service.ts` | Created | 2 | Shelves service (placeholder) |
| 17 | `src/shelves/entities/shelf.entity.ts` | Created | 2 | Shelf entity (placeholder) |
| 18 | `src/reading-sessions/reading-sessions.module.ts` | Created | 2 | Reading sessions module |
| 19 | `src/reading-sessions/reading-sessions.controller.ts` | Created | 2 | Reading sessions controller (placeholder) |
| 20 | `src/reading-sessions/reading-sessions.service.ts` | Created | 2 | Reading sessions service (placeholder) |
| 21 | `src/reading-sessions/entities/reading-session.entity.ts` | Created | 2 | Reading session entity (placeholder) |
| 22 | `src/recommendations/recommendations.module.ts` | Created | 2 | Recommendations module |
| 23 | `src/recommendations/recommendations.controller.ts` | Created | 2 | Recommendations controller (placeholder) |
| 24 | `src/recommendations/recommendations.service.ts` | Created | 2 | Recommendations service (placeholder) |
| 25 | `src/recommendations/recommendations.processor.ts` | Created | 2 | BullMQ job handler (placeholder) |
| 26 | `src/external/open-library/open-library.module.ts` | Created | 2 | OpenLibrary HTTP client module |
| 27 | `src/external/open-library/open-library.service.ts` | Created | 2 | OpenLibrary service (placeholder) |
| 28 | `src/common/filters/http-exception.filter.ts` | Created | 2 | Global exception filter |
| 29 | `src/common/interceptors/logging.interceptor.ts` | Created | 2 | Logging interceptor (placeholder) |
| 30 | `src/common/interceptors/transform.interceptor.ts` | Created | 2 | Response transform interceptor (placeholder) |
| 31 | `src/common/decorators/user-id.decorator.ts` | Created | 2 | `@UserId()` parameter decorator |
| 32 | `src/common/interfaces/paginated-response.interface.ts` | Created | 2 | Generic paginated response interface |
| 33 | `.env.example` | Created | 3 | Environment variable template |
| 34 | `.gitignore` | Created | 3 | Ignores node_modules, dist, .env, IDE files |
| 35 | `Makefile` | Created | 3 | Common dev commands (up, down, build, test, lint) |
| 36 | `docker/Dockerfile` | Created | 3 | Multi-stage build for NestJS app |
| 37 | `docker/docker-compose.yml` | Created | 3 | App + MongoDB + Redis services |
| 38 | `test/jest-e2e.json` | Created | 3 | Jest e2e test configuration |
| 39 | `agent-development/agent-specs/architecture-breakdown.md` | Modified | 4 | Synced with actual installed deps and module structure |
| 40 | `agent-development/agent-specs/FOLDER-STRUCTURE.md` | Modified | 4 | Synced with actual directory tree |
| 41 | `README.md` | Created | 5 | Project overview, setup, and usage |

**Total files created: 39 | Total files modified: 2**

---

## Post-Completion Checklist

The implementing agent must verify each item after ALL stages are complete:

- [ ] All stage `status` fields in `manifest.json` are `done`
- [ ] `yarn install` succeeds with zero errors
- [ ] `yarn build` compiles with zero TypeScript errors
- [ ] `yarn test` runs the Jest test runner without crashing (0 tests OK)
- [ ] `docker compose -f docker/docker-compose.yml config` validates without errors
- [ ] Every directory from `FOLDER-STRUCTURE.md` exists on disk
- [ ] `.env.example` contains all variables used in `src/config/configuration.ts`
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `.env`
- [ ] `Makefile` targets `up`, `down`, `build`, `test`, `lint` all resolve without syntax errors
- [ ] No unrelated files were modified or deleted
- [ ] `agent-development/agent-specs/` files are up to date (Stage 4)
- [ ] `README.md` is up to date (Stage 5)

---

## Notes for the Implementing Agent

1. The source code is the source of truth — read it directly.
2. Execute stages in order. Do not start a stage until its predecessor is marked `done` in `manifest.json`.
3. After completing each stage, update its `status` in `manifest.json` to `done` and set `current_stage` to the next stage number.
4. All placeholder files should contain valid TypeScript that compiles. Empty classes with the correct decorators are fine — do not add business logic yet.
5. Do NOT install any dependencies beyond what this plan specifies. Future tasks will add dependencies as needed.
6. The database connection in `database.module.ts` uses a simple URI from config. Migrations will be managed separately in a later task.