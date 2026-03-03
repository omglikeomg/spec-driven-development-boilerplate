# Agent Instructions & Coding Standards

<!-- 
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  THIS IS A STARTING POINT — Tweak these instructions to fit your project   ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
  
  These instructions are loaded as context for every agent conversation. They
  tell the agent how you want code written, what patterns to follow, and what
  to avoid.
  
  You WILL need to customize this file as your project evolves. Treat it as a
  living document — update it whenever you establish a new convention or catch
  an agent making a mistake you don't want repeated.
  
  Areas you'll almost certainly want to tweak:
  - The "Your Role" section (match it to your actual tech stack)
  - The "Dos and Don'ts" section (add project-specific rules as you discover them)
  - The "Error Handling" section (adapt to your error strategy)
  - The "Testing" section (match your test framework and coverage expectations)
-->

## Your Role

You are an expert TypeScript developer specializing in backend services built with NestJS. Your goal is to implement the requested tasks while maintaining a clean, well-typed, and idiomatic codebase.

<!-- 
  👆 TWEAK THIS: Change the role to match your project. Examples:
  - "You are an expert React developer specializing in Next.js applications."
  - "You are an expert TypeScript developer building CLI tools with Commander.js."
  - "You are a full-stack developer working with NestJS and React."
-->

## Dos and Don'ts

<!-- 
  👆 TWEAK THIS: These rules should reflect YOUR project's conventions.
  Start with these sensible defaults, then add rules as you notice agents
  making choices you disagree with. Every time you correct an agent manually,
  consider adding a rule here so it doesn't happen again.
-->

### General

- **DO:** Write TypeScript in strict mode. Never use `any` unless absolutely unavoidable — prefer `unknown` and narrow with type guards.
- **DO:** Use `async/await` consistently. Never mix `.then()` chains and `await` in the same function.
- **DO:** Prefer named exports over default exports for better refactoring support and grep-ability.
- **DO:** Keep functions small and focused. If a function exceeds ~40 lines, consider splitting it.
- **DON'T:** Suppress TypeScript errors with `@ts-ignore` or `@ts-expect-error` without a comment explaining why.
- **DON'T:** Use `console.log` for application logging. Use the injected `Logger` service instead.
- **DON'T:** Commit commented-out code. Remove it or put it behind a feature flag.

### NestJS-Specific

<!-- 
  👆 TWEAK THIS: Replace with rules specific to your framework. If you're 
  using Express directly, React, or something else entirely, rewrite this section.
-->

- **DO:** Use dependency injection for all service dependencies. Never instantiate services with `new` inside other services.
- **DO:** Define DTOs for all request bodies and use `class-validator` decorators for validation.
- **DO:** Keep controllers thin — they should delegate to services immediately. No business logic in controllers.
- **DON'T:** Access `request` or `response` objects directly in services. Services must be transport-agnostic.
- **DON'T:** Use synchronous file I/O (`readFileSync`, `writeFileSync`) in request handlers.
- **DON'T:** Import from other feature modules' internal files. Use the module's exported providers only.

### Database

<!-- 
  👆 TWEAK THIS: Adapt to your ODM/ORM (Prisma, Drizzle, TypeORM, etc.) or remove 
  entirely if your project doesn't use a database.
-->

- **DO:** Use Mongoose models and schemas for all database access. Never call `mongoose.connection` directly from service files — use the injected `Model<T>` from `@nestjs/mongoose`.
- **DO:** Write migrations for every schema change. Never rely on auto-sync outside of local development.
- **DO:** Use Mongoose transactions (sessions) for operations that modify multiple collections.
- **DON'T:** Put raw MongoDB queries in service files. If aggregation pipelines or raw queries are needed, put them in a dedicated repository or data-access layer.
- **DON'T:** Use `cascade` deletes without explicit confirmation in the plan/request.

### Git

- **DO:** Read `agent-development/agent-specs/git-workflow.md` before making any commits — it defines branching, commit message format, and when to commit.
- **DO:** Run `git branch --show-current` at the start of every conversation to confirm you are on a feature branch and to extract any ticket ID from the branch name.
- **DO:** Use [Conventional Commits](https://www.conventionalcommits.org/) for every commit message. Choose the commit type based on what the change actually does (`feat`, `fix`, `refactor`, `docs`, etc.).
- **DO:** Include the ticket ID in commit messages if one is detected in the branch name (e.g., `feat(books): PROJ-123 add pagination`).
- **DO:** Commit once per completed plan stage, after verification passes. Commit once for an entire quick fix, after verification passes.
- **DON'T:** Commit directly to `main`. If you detect you are on `main`, **STOP** and ask the human to create a feature branch.
- **DON'T:** Commit code that fails its verification checks. Fix first, then commit.
- **DON'T:** Fabricate ticket IDs. If no ticket ID is found in the branch name, omit it from the commit message.
- **DON'T:** Manually bump version numbers or edit version files — versioning is handled by the human or CI when the PR is merged.

## Error Handling

<!-- 
  👆 TWEAK THIS: Define your project's error strategy. This section prevents
  agents from inventing their own inconsistent error patterns.
-->

- Throw NestJS `HttpException` subclasses (`NotFoundException`, `BadRequestException`, etc.) from services when a request cannot be fulfilled. The global exception filter handles serialization.
- For internal errors that are NOT the client's fault (e.g., a failed external API call), throw a plain `Error` or a custom `InternalError` class. The exception filter converts these to 500 responses with a generic message (no stack traces in production).
- Always log errors with context: `this.logger.error('Failed to fetch metadata', { bookId, isbn, error: err.message })`.
- External API calls must have timeouts (default: 5000ms) and must catch network errors gracefully — never let an `ECONNREFUSED` crash the process.

## Testing

<!-- 
  👆 TWEAK THIS: Match your test framework and expectations. Some projects 
  want 90% coverage, others just want critical paths tested. Be explicit.
-->

- **Unit tests** live next to their source files: `books.service.spec.ts` alongside `books.service.ts`.
- **E2E tests** live in the `/test/` directory at the project root.
- Use `jest.mock()` or NestJS `Test.createTestingModule` with `overrideProvider` for dependency mocking.
- Every service method that contains business logic must have at least one happy-path and one error-path test.
- Test file names must use the `.spec.ts` (unit) or `.e2e-spec.ts` (e2e) suffix.
- Run tests with `yarn test` (unit) or `yarn test:e2e` (e2e).

## File & Naming Conventions

<!-- 
  👆 TWEAK THIS: Naming is one of the most impactful things to standardize.
  Agents will follow whatever you put here religiously.
-->

- **Files:** `kebab-case.ts` for all source files. Suffix with the file's role: `.controller.ts`, `.service.ts`, `.repository.ts`, `.entity.ts`, `.dto.ts`, `.module.ts`, `.spec.ts`.
- **Classes:** `PascalCase`. Controllers: `BooksController`. Services: `BooksService`. Entities: `Book` (singular).
- **Interfaces:** `PascalCase` prefixed with `I` only when needed to disambiguate from a class (e.g., `IBookRepository`). Otherwise, just use `PascalCase`.
- **Variables & functions:** `camelCase`. Constants: `UPPER_SNAKE_CASE`.
- **Directories:** `kebab-case`. Feature modules get their own top-level directory under `src/`.

## Workflow

These steps apply to every task, regardless of size:

1. **Verify your branch** — run `git branch --show-current` to confirm you are on a feature branch (not `main`). Extract the ticket ID from the branch name if present. See `agent-development/agent-specs/git-workflow.md` for branch naming conventions and ticket ID detection.
2. Read the provided plan folder — start with `manifest.json` for task state and stage overview, then `specification.md` for the full context and resolved open questions.
3. For each stage, read the stage's instruction file (e.g., `1-stage-name.md`) and the source code files listed in its "Allowed Read Access" section. Use `agent-development/agent-specs/architecture-breakdown.md` for quick orientation if needed.
4. Implement the logic, respecting the stage's blast radius — only modify files listed in "Allowed Write Access."
5. Run the verification commands listed in the stage's "Verification" section.
6. After each stage passes, update `manifest.json`: set the stage's `status` to `done` and increment `current_stage`.
7. **Commit the stage** — commit all changes from this stage (including the `manifest.json` update) using a conventional commit message. See `agent-development/agent-specs/git-workflow.md` for the commit message format.
8. Every plan ends with two mandatory stages: **spec updates** (update `agent-development/agent-specs/` files) and **documentation updates** (update `README.md` and human-facing docs). Do not skip these unless the stage instructions explicitly say no changes are needed (in which case mark the stage `skipped`).
9. After all stages are complete and archive file moves are done, make a **separate commit** for the archive moves: `chore: <ticket-id> archive completed plan and request`.

## Source Code Is the Source of Truth

The TypeScript source files are the canonical reference for how the system works. When working on a task:

1. **Read the source code directly** for the modules and files relevant to your current stage. The code should be well-structured and self-documenting.
2. **Use `agent-development/agent-specs/architecture-breakdown.md`** for quick orientation on project layout if you're unfamiliar with the directory structure.
3. **Respect the blast radius** — each stage file explicitly lists which files you may read and write. If you discover a dependency on an unlisted file, stop and update the manifest and stage file before proceeding.
4. **Spec and doc updates are handled in mandatory final stages** — do not update spec files or documentation mid-plan unless a stage's instructions explicitly say to.

## Docker & Local Development

<!-- 
  👆 TWEAK THIS: Only relevant if your project uses Docker. Remove or 
  simplify if it doesn't. Update service names and ports to match your setup.
-->

- The local development environment is managed via `docker-compose.yml`. All supporting services (database, Redis, etc.) run in containers.
- The NestJS application can run either inside a container or directly on the host (connecting to containerized services).
- Use the `Makefile` for common operations — prefer `make up`, `make down`, `make test` over raw Docker/yarn commands.
- Environment-specific values go in `.env` files. Never hardcode ports, URLs, or credentials in source code.
- The `.env.example` file is the git-tracked template. After cloning, users must `cp .env.example .env` and fill in their values.