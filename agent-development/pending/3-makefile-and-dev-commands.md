# Task 3: Makefile & Local Development Commands

## Goal

Create a comprehensive `Makefile` at the project root that serves as the single entry point for every common development operation — starting and stopping the Docker stack, building the app, running tests, seeding the database, viewing logs, and performing housekeeping tasks — so that developers never need to remember raw `docker compose`, `yarn`, or `npx` incantations.

## Context

Requires Task 1 (Docker Infrastructure) and Task 2 (Configuration & Environment Management) to be completed first, since the Makefile wraps Docker Compose commands and references `.env` files established in those tasks.

A well-designed Makefile eliminates the "how do I run this again?" problem for every developer who touches the project. It also serves as living documentation of the project's operational surface area — scanning the Makefile tells you everything the project can do. Every command should work immediately after cloning the repo and running `make setup`.

## Requirements

- Create a `Makefile` at the project root with clearly grouped targets covering the categories below.
- Every target must include a brief `## comment` on the same line so that a `make help` target can auto-generate a human-readable command reference.
- All Docker Compose commands must reference the compose file explicitly (`-f docker/docker-compose.yml`) so the Makefile works regardless of the developer's working directory.
- Targets that depend on the Docker stack being up should declare that dependency clearly (either via Make prerequisites or a guard check).
- Port numbers and service names must NOT be hardcoded in the Makefile — they should come from `.env` or from Docker Compose's own variable interpolation.
- The Makefile must use `.PHONY` declarations for all targets (none of these correspond to real files).

### Target Categories

#### 1. Setup & Initialization

| Target | Description |
|---|---|
| `setup` | One-time project bootstrap: copies `.env.example` → `.env` (if `.env` doesn't exist), runs `yarn install`, and prints a success message with next steps. |
| `install` | Runs `yarn install` (useful after pulling new changes). |

#### 2. Docker Stack Management

| Target | Description |
|---|---|
| `up` | Starts all containers in detached mode (`docker compose up -d`). Includes the dev override file for hot-reload. |
| `down` | Stops and removes all containers. Does NOT remove volumes (data is preserved). |
| `down-clean` | Stops containers AND removes volumes (full reset — database data is lost). |
| `restart` | Runs `down` then `up`. |
| `ps` | Shows the status of all containers (`docker compose ps`). |
| `logs` | Tails logs from all containers (`docker compose logs -f`). |
| `logs-app` | Tails logs from only the `app` container. |

#### 3. Application Development (Host-Side)

| Target | Description |
|---|---|
| `start` | Starts the NestJS app locally (outside Docker) in watch mode (`yarn start:dev`). Assumes database and Redis are running via Docker. |
| `build` | Compiles TypeScript (`yarn build`). |
| `lint` | Runs ESLint with auto-fix (`yarn lint`). |
| `format` | Runs Prettier on all source files. |

#### 4. Testing

| Target | Description |
|---|---|
| `test` | Runs the unit test suite (`yarn test`). |
| `test-watch` | Runs unit tests in watch mode (`yarn test --watch`). |
| `test-cov` | Runs unit tests with coverage report (`yarn test --coverage`). |
| `test-e2e` | Runs end-to-end tests (`yarn test:e2e`). |

#### 5. Database Operations

| Target | Description |
|---|---|
| `db-migrate` | Runs pending database migrations (`npx migrate-mongo up`). |
| `db-migrate-revert` | Reverts the last database migration (`npx migrate-mongo down`). |
| `db-migrate-generate` | Generates a new migration file. Expects a `NAME` variable (e.g., `make db-migrate-generate NAME=add-books-collection`). |
| `db-seed` | Runs the seed script to populate the database with development data. |
| `db-shell` | Opens a `mongosh` session inside the running MongoDB container. |

#### 6. Utilities

| Target | Description |
|---|---|
| `help` | Parses `##` comments from the Makefile and prints a formatted list of all available targets. This should be the default target (i.e., running bare `make` shows help). |
| `clean` | Removes `dist/`, `node_modules/`, and coverage reports. |
| `check` | Runs `lint`, `build`, and `test` in sequence — a quick pre-commit sanity check. |

## Implementation Details

1. **`Makefile` (project root):**
   - Use `.PHONY` for all targets.
   - Use `?=` for variables that can be overridden (e.g., `COMPOSE_FILE ?= docker/docker-compose.yml`).
   - The `help` target should use `grep` + `awk`/`sed` to extract `## comments` from the Makefile itself. A common pattern:
     ```
     help: ## Show this help message
         @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
     ```
   - The `setup` target should be idempotent — running it twice should not overwrite an existing `.env`.
   - The `db-migrate-generate` target must check that the `NAME` variable is provided and print a usage message if not:
     ```
     db-migrate-generate: ## Generate a migration (usage: make db-migrate-generate NAME=my-migration)
         @[ "$(NAME)" ] || (echo "Error: NAME is required. Usage: make db-migrate-generate NAME=my-migration" && exit 1)
         npx migrate-mongo create $(NAME)
     ```
   - Use `@` prefix on echo/printf commands to suppress Make's own command echoing for cleaner output.
   - Group targets visually with comment headers (e.g., `# === Docker ===`).

2. **Integration with existing files:**
   - The Makefile should reference `docker/docker-compose.yml` and `docker/docker-compose.override.yml` from Task 1.
   - Database connection parameters for `db-shell` should come from the `.env` file or Docker Compose environment — never hardcoded.

3. **Developer experience touches:**
   - `make setup` should print a colored success message with instructions like "Run 'make up' to start the stack."
   - `make up` should print the URL where the app will be available after starting (e.g., "App will be available at http://localhost:${PORT:-3000}").
   - `make down-clean` should print a warning that database data will be lost and require confirmation (or at minimum print a clear warning message).

## Deliverables

- [ ] `Makefile` at the project root with all targets listed above
- [ ] Running `make` (with no arguments) prints the help output
- [ ] Every target has a `## comment` visible in `make help`
- [ ] No hardcoded ports, passwords, or service names in the Makefile

## Agent Checklist

- [ ] `make help` prints a formatted list of all targets
- [ ] `make setup` creates `.env` from `.env.example` if it doesn't already exist
- [ ] `make setup` does NOT overwrite an existing `.env`
- [ ] `make up` starts the Docker stack using the correct compose file paths
- [ ] `make down-clean` removes volumes (verify with `docker volume ls` before/after)
- [ ] `make db-migrate-generate` without `NAME` prints a usage error and exits non-zero
- [ ] `make check` runs lint, build, and test in sequence
- [ ] All targets are declared in `.PHONY`
- [ ] No port numbers, passwords, or database names are hardcoded in the Makefile
- [ ] Update `agent-development/agent-specs/architecture-breakdown.md` if structural changes were introduced
- [ ] Update `agent-development/agent-specs/FOLDER-STRUCTURE.md` if new files or directories were introduced
- [ ] Update `README.md` with a reference to `make help` and key Makefile commands