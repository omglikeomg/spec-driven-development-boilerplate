# Stage 3: Docker, Environment & Makefile

**Plan:** `0-project-bootstrapping`
**Status:** done
**Last Updated:** 2025-01-15

---

## Objective

Create the Docker infrastructure (Dockerfile, docker-compose.yml), environment configuration (.env.example), project hygiene files (.gitignore), the Makefile for common dev operations, and Jest e2e configuration. After this stage, `docker compose config` validates successfully, `make help` lists all targets, and the project is ready to run in containers.

---

## Resource Constraints (Blast Radius)

> Only the following files/directories may be accessed or modified during this stage.

### Allowed Read Access

| Path | Reason |
|---|---|
| `src/config/configuration.ts` | Reference for which environment variables the app expects |
| `package.json` | Reference for scripts the Makefile should wrap |
| `agent-development/agent-specs/FOLDER-STRUCTURE.md` | Confirms expected location of Docker files |

### Allowed Write Access

| Path | Reason |
|---|---|
| `.env.example` | Git-tracked environment variable template |
| `.gitignore` | Build artifacts, secrets, and IDE file exclusions |
| `Makefile` | Common dev command wrappers |
| `docker/Dockerfile` | Multi-stage build for the NestJS app |
| `docker/docker-compose.yml` | App + MongoDB + Redis service definitions |
| `docker/.dockerignore` | Build context exclusions |
| `test/jest-e2e.json` | Jest configuration for e2e tests |

### Forbidden

- Any file or directory not listed above is **out of scope** for this stage.
- Do NOT modify any `src/` files — those were finalized in Stage 2.
- Do NOT modify `package.json` or install new dependencies.

---

## Prerequisites

- [ ] Stage 2 is marked `done` in `manifest.json`
- [ ] Docker and Docker Compose are installed and the Docker daemon is running

---

## Instructions

### Step 3.1: Create the environment variable template

**File:** `.env.example`
**Action:** create

```env
# === Application ===
PORT=3000
NODE_ENV=development

# === Database (MongoDB) ===
DATABASE_URI=mongodb://localhost:27017/bookshelf

# === Redis ===
REDIS_HOST=localhost
REDIS_PORT=6379
```

Every variable referenced in `src/config/configuration.ts` must appear here with a safe default value.

---

### Step 3.2: Create the Dockerfile

**File:** `docker/Dockerfile`
**Action:** create

Multi-stage build:
- **Build stage:** `FROM node:20-alpine AS builder`, install deps with `--frozen-lockfile`, copy source, run `yarn build`.
- **Production stage:** `FROM node:20-alpine`, copy `dist/`, `node_modules/`, and `package.json` from builder. Expose port 3000. CMD `node dist/main`.

---

### Step 3.3: Create docker-compose.yml

**File:** `docker/docker-compose.yml`
**Action:** create

Define three services:

- **app** — built from `docker/Dockerfile`, port mapped via `${PORT:-3000}:3000`, env_file pointing to `../.env`, depends_on `mongo` and `redis` with `condition: service_healthy`.
- **mongo** — `mongo:7`, port `${DATABASE_PORT:-27017}:27017`, named volume `mongodata`, health check using `mongosh --eval "db.adminCommand('ping')"`.
- **redis** — `redis:7-alpine`, port `${REDIS_PORT:-6379}:6379`, health check using `redis-cli ping`.

All port mappings must use environment variables with defaults. No hardcoded ports.

---

### Step 3.4: Create .dockerignore

**File:** `docker/.dockerignore`
**Action:** create

Exclude: `node_modules`, `dist`, `.git`, `.env`, `agent-development`, `user-development`, `*.md`, `test`.

---

### Step 3.5: Create .gitignore

**File:** `.gitignore`
**Action:** create

```
node_modules/
dist/
.env
.env.test
.env.production
*.js.map
coverage/
.idea/
.vscode/
*.swp
*.swo
```

---

### Step 3.6: Create the Makefile

**File:** `Makefile`
**Action:** create

Create targets with `## comments` for auto-generated help:

- `help` (default) — grep/awk pattern to print formatted target list
- `up` — `docker compose -f docker/docker-compose.yml up -d`
- `down` — `docker compose -f docker/docker-compose.yml down`
- `build` — `yarn build`
- `test` — `yarn test`
- `test-e2e` — `yarn test:e2e`
- `lint` — `yarn lint`
- `start` — `yarn start:dev`

All targets must be declared in `.PHONY`. No hardcoded ports or credentials.

---

### Step 3.7: Create Jest e2e configuration

**File:** `test/jest-e2e.json`
**Action:** create

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

---

## Verification

### Automated Checks

| Command | Expected Result |
|---|---|
| `docker compose -f docker/docker-compose.yml config` | Valid YAML, all three services defined, exit code 0 |
| `make help` | Prints formatted list of all targets |
| `test -f .env.example` | File exists |
| `test -f .gitignore` | File exists |
| `test -f test/jest-e2e.json` | File exists |

### Manual Verification

- [ ] All port mappings in `docker-compose.yml` use `${VAR:-default}` syntax (no hardcoded ports)
- [ ] `mongo` and `redis` services have health checks defined
- [ ] `app` service has `depends_on` with `condition: service_healthy` for both dependencies
- [ ] `.env.example` contains every variable referenced in `src/config/configuration.ts`
- [ ] `.gitignore` includes `.env` but NOT `.env.example`
- [ ] Every Makefile target is listed in `.PHONY`

### Artifacts

- [ ] All output files listed in the manifest for this stage exist and are non-empty
- [ ] No modifications were made outside the blast radius

---

## Rollback Plan

If this stage fails or must be reverted:

1. Delete `.env.example`, `.gitignore`, `Makefile`, `test/jest-e2e.json`
2. Delete the `docker/` directory
3. Set this stage's `status` to `failed` in `manifest.json`

---

## Notes

- The `docker-compose.yml` lives in `docker/` per the resolved Open Question Q2 in the specification. The Makefile abstracts the `-f docker/docker-compose.yml` path so developers just run `make up`.
- The `.dockerignore` is placed inside `docker/` because the build context is set to `..` (project root) in the compose file. Docker resolves `.dockerignore` relative to the build context, but placing it alongside the Dockerfile is acceptable when using the `dockerfile:` directive.
- The `test/` directory was already created in Stage 2. This stage only adds the `jest-e2e.json` config file inside it.