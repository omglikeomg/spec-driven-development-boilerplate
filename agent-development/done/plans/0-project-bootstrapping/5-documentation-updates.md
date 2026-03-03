# Stage 5: Documentation Updates

**Plan:** `0-project-bootstrapping`
**Status:** done
**Last Updated:** 2025-01-15

---

## Objective

Update all human-facing documentation to reflect the bootstrapped project state. After this stage, a new developer can clone the repo, read the README, and have a clear path to getting the project running locally — without needing to ask anyone or read source code.

This is the mandatory final stage. Every plan must include a documentation update stage — even if the conclusion is "no changes needed" (in which case the stage is marked `skipped` with a justification).

---

## Resource Constraints (Blast Radius)

> Only the following files/directories may be accessed or modified during this stage.

### Allowed Read Access

| Path | Reason |
|---|---|
| `Makefile` | Reference for which dev commands to document |
| `.env.example` | Reference for which environment variables to document |
| `docker/docker-compose.yml` | Reference for which services exist and their ports |
| `package.json` | Reference for prerequisites (Node version, Yarn) and scripts |
| `tsconfig.json` | Reference for TypeScript version requirements |
| `src/main.ts` | Reference for how the app starts |
| `agent-development/agent-specs/application-overview.md` | Project purpose (to align README messaging) |
| `agent-development/agent-specs/architecture-breakdown.md` | Architecture summary (to include in README) |
| `README.md` | Current state — to be updated |
| `user-development/DEVELOPMENT-GUIDE.md` | Review for accuracy with new project structure |

### Allowed Write Access

| Path | Reason |
|---|---|
| `README.md` | Primary human-facing documentation |
| `user-development/DEVELOPMENT-GUIDE.md` | Workflow guide — update if bootstrapping changed any conventions |

### Forbidden

- Any file or directory not listed above is **out of scope** for this stage.
- Do NOT modify any source code, Docker files, config files, or spec files — those were finalized in earlier stages.
- Do NOT modify agent-facing documents (`agent-development/agent-specs/*`) — that was Stage 4.

---

## Prerequisites

- [ ] Stage 4 is marked `done` in `manifest.json`
- [ ] All source files, Docker files, config files, and spec files are in their final state

---

## Instructions

### Step 5.1: Write the project README

**File:** `README.md`
**Action:** create (or overwrite the boilerplate placeholder)

The README must include the following sections, in order:

1. **Title and one-line description** — project name and a single sentence explaining what it does.

2. **Prerequisites** — list required tools with minimum versions:
   - Node.js 20 LTS
   - Yarn (v1 classic)
   - Docker and Docker Compose

3. **Quick Start** — numbered steps to go from clone to running:
   ```
   1. Clone the repository
   2. cp .env.example .env
   3. yarn install
   4. make up          # starts MongoDB + Redis
   5. make start       # starts the NestJS app in watch mode
   ```

4. **Available Commands** — reference to `make help` with a brief table of the most important targets (`up`, `down`, `build`, `test`, `lint`, `start`).

5. **Configuration** — explain the `.env.example` → `.env` convention. List all environment variables with their purpose and defaults. Reference `src/config/configuration.ts` as the canonical source.

6. **Docker Services** — table showing each service from `docker-compose.yml`, its image, default port, and purpose:
   | Service | Image | Default Port | Purpose |
   |---|---|---|---|
   | app | Custom (Dockerfile) | 3000 | NestJS application |
   | mongo | mongo:7 | 27017 | Primary database |
   | redis | redis:7-alpine | 6379 | Job queue (BullMQ) |

7. **Project Structure** — a condensed version of the directory tree from `FOLDER-STRUCTURE.md` (just the top two levels, not every file). Link to `FOLDER-STRUCTURE.md` for the full tree.

8. **Development Workflow** — brief mention of the SDD workflow with a link to `user-development/DEVELOPMENT-GUIDE.md` for the full process.

9. **License** — TBD or as appropriate.

Write the content in a clear, scannable style. Use tables for structured data. Keep prose minimal — developers read READMEs by scanning, not by reading top to bottom.

---

### Step 5.2: Review DEVELOPMENT-GUIDE.md for accuracy

**File:** `user-development/DEVELOPMENT-GUIDE.md`
**Action:** modify (if needed)

Read through the development guide and verify:

1. **Directory Layout section** — does the tree still match reality? If the bootstrapping process added any pipeline-related files or directories not shown in the guide's tree, update it.

2. **Configuration Files section** — does the table of git-tracked templates vs. runtime copies match what was actually created? Ensure `.env.example` → `.env` is listed.

3. **Document Templates section** — verify that the template locations listed in the table are correct (templates now live in `plans/_templates/` as a folder, not a single file).

4. **Quick Reference section** — verify that the example commands and file references are accurate.

5. **If no changes are needed**, do not modify the file. Note in the verification section that the file was reviewed and found accurate.

---

## Verification

### Automated Checks

| Command | Expected Result |
|---|---|
| `test -f README.md` | File exists |
| `wc -l README.md` | Reasonably long (> 50 lines — a stub README indicates missing content) |

### Manual Verification

- [ ] `README.md` — contains a Prerequisites section listing Node.js, Yarn, and Docker
- [ ] `README.md` — contains a Quick Start section with numbered steps from clone to running
- [ ] `README.md` — contains an Available Commands section referencing `make help`
- [ ] `README.md` — contains a Configuration section listing all variables from `.env.example`
- [ ] `README.md` — contains a Docker Services table matching `docker-compose.yml`
- [ ] `README.md` — contains a Project Structure section with a directory tree
- [ ] `README.md` — links to `user-development/DEVELOPMENT-GUIDE.md` for the SDD workflow
- [ ] `README.md` — no broken links, no placeholder text, no TODO markers
- [ ] `DEVELOPMENT-GUIDE.md` — reviewed for accuracy (either updated or confirmed correct)
- [ ] No stale references to tools, paths, or commands that don't exist in the project

### Artifacts

- [ ] All output files listed in the manifest for this stage exist and are non-empty
- [ ] No modifications were made outside the blast radius

---

## Rollback Plan

If this stage fails or must be reverted:

1. Revert `README.md` via `git checkout`
2. Revert `user-development/DEVELOPMENT-GUIDE.md` via `git checkout` (if modified)
3. Set this stage's `status` to `failed` in `manifest.json`

---

## Notes

- The README is the single most-read file in any repository. Invest in making it scannable and accurate. A developer should be able to go from "I just cloned this" to "the app is running" by following the Quick Start section alone, without reading anything else.
- The README should not duplicate the full DEVELOPMENT-GUIDE.md content. It should link to it. The README is for "how do I run this?"; the guide is for "how do I contribute using the SDD workflow?".
- If the bootstrapping plan resolved open questions (e.g., Q1 about Yarn Classic, Q2 about Docker directory), the README should reflect those decisions naturally (e.g., "Install Yarn v1" not "Install Yarn v1 or v4"). Don't mention the open questions in the README — just apply the resolved decisions.
- This is the last stage. After completing it, update all stage statuses to `done` in `manifest.json`, set `current_stage` to the total number of stages, and set `plan_metadata.status` to `done`.