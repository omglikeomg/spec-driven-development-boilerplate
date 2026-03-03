# Agent Instructions & Coding Standards

<!-- 
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  THIS IS A STARTING POINT — Tweak these instructions to fit your project   ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
  
  This file contains your project's CODING STANDARDS — how you want code
  written, what patterns to follow, and what to avoid. It is loaded as context
  for every agent conversation.
  
  The WORKFLOW and EXECUTION RULES (how agents interact with plans, stages,
  blast radius, commits, etc.) live in agent-workflow.md. That file is
  system-level and typically doesn't need customization. This file is the one
  you'll customize heavily as your project evolves.
  
  Treat this as a living document — update it whenever you establish a new
  convention or catch an agent making a mistake you don't want repeated.
  
  Areas you'll almost certainly want to tweak:
  - The "Your Role" section (match it to your actual tech stack)
  - The "Dos and Don'ts" section (add project-specific rules as you discover them)
  - The "Error Handling" section (adapt to your error strategy)
  - The "Testing" section (match your test framework and coverage expectations)
  
  NOTE: The examples below use TypeScript/NestJS.
  If your project uses a different framework or language, replace
  the framework-specific sections entirely — but keep the same heading
  structure so agents know where to look.
-->

## Your Role

You are an expert TypeScript developer specializing in backend services built with NestJS. Your goal is to implement the requested tasks while maintaining a clean, well-typed, and idiomatic codebase.

<!-- 
  👆 TWEAK THIS: Change the role to match your project. Examples:
  - "You are an expert React developer specializing in Next.js applications."
  - "You are an expert TypeScript developer building CLI tools with Commander.js."
  - "You are a full-stack developer working with NestJS and React."
  - "You are an expert Go developer building microservices with the standard library."
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

## Relationship to Other Spec Files

| File | What It Covers |
|---|---|
| `agent-instructions.md` (this file) | Coding standards, dos/don'ts, naming, testing, error handling — **customize this** |
| `agent-workflow.md` | Execution rules, blast radius, commit timing, spec/doc updates — system-level, rarely customized |
| `architecture-breakdown.md` | Directory tree, module dependencies, design patterns, tech stack |
| `application-overview.md` | What the app does, core workflows, UX goals |
| `git-workflow.md` | Branching, commit format, ticket ID pattern, versioning |
