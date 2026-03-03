# Architecture Breakdown & Design Patterns

<!-- 
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  THIS IS AN EXAMPLE — Replace this entire file with your project's details ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
  
  This file is the single source of truth for how your project is organized.
  It covers: directory tree, per-directory explanations, design patterns,
  technology stack, key architectural decisions, module dependencies, and
  project-wide conventions.
  
  Agents read this file to understand where to put new code and how existing
  pieces fit together. The more precise you are, the fewer mistakes agents
  will make.
  
  Maintenance rule: If a task adds or removes top-level directories, modules,
  or significant files, update this file as part of the task deliverables.
  Keep it updated — stale structure docs are worse than no docs at all.
-->

> **Last updated:** Task 0 — Project Bootstrapping — YYYY-MM-DD
> **Maintenance rule:** If a task adds or removes top-level directories, modules, or significant files, update this file as part of the task deliverables.

---

## Directory Tree

```
my-project/
├── src/
│   ├── main.ts                              ← Entry point: bootstraps NestJS app
│   ├── app.module.ts                        ← Root module: imports all feature modules
│   │
│   ├── config/
│   │   ├── config.module.ts                 ← Config module (global)
│   │   └── configuration.ts                 ← Config factory function (reads .env, validates with Joi)
│   │
│   ├── database/
│   │   ├── database.module.ts               ← Mongoose connection setup
│   │   ├── migrations/                      ← Database migration files
│   │   └── seeds/                           ← Development seed data
│   │
│   ├── books/
│   │   ├── books.module.ts
│   │   ├── books.controller.ts
│   │   ├── books.service.ts
│   │   ├── books.repository.ts
│   │   ├── entities/
│   │   │   └── book.entity.ts
│   │   └── dto/
│   │       ├── create-book.dto.ts
│   │       ├── update-book.dto.ts
│   │       └── book-response.dto.ts
│   │
│   ├── shelves/
│   │   ├── shelves.module.ts
│   │   ├── shelves.controller.ts
│   │   ├── shelves.service.ts
│   │   ├── shelves.repository.ts
│   │   ├── entities/
│   │   │   └── shelf.entity.ts
│   │   └── dto/
│   │       ├── create-shelf.dto.ts
│   │       └── shelf-response.dto.ts
│   │
│   ├── reading-sessions/
│   │   ├── reading-sessions.module.ts
│   │   ├── reading-sessions.controller.ts
│   │   ├── reading-sessions.service.ts
│   │   ├── entities/
│   │   │   └── reading-session.entity.ts
│   │   └── dto/
│   │       └── create-session.dto.ts
│   │
│   ├── recommendations/
│   │   ├── recommendations.module.ts
│   │   ├── recommendations.controller.ts
│   │   ├── recommendations.service.ts
│   │   └── recommendations.processor.ts    ← BullMQ job handler
│   │
│   ├── external/
│   │   └── open-library/
│   │       ├── open-library.module.ts
│   │       └── open-library.service.ts     ← HTTP client for OpenLibrary API
│   │
│   └── common/
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   ├── logging.interceptor.ts
│       │   └── transform.interceptor.ts
│       ├── pipes/
│       │   └── validation.pipe.ts
│       ├── decorators/
│       │   └── user-id.decorator.ts
│       └── interfaces/
│           └── paginated-response.interface.ts
│
├── test/
│   ├── books.e2e-spec.ts
│   ├── shelves.e2e-spec.ts
│   └── jest-e2e.json
│
├── docker/
│   ├── Dockerfile                           ← Multi-stage build for the NestJS app
│   └── docker-compose.yml                   ← App + MongoDB + Redis
│
├── user-development/
│   ├── DEVELOPMENT-GUIDE.md                 ← Human-facing workflow guide
│   └── prompts/
│       ├── 1-plan-task.md
│       ├── 2-execute-plan.md
│       ├── 3-request-feature.md
│       └── 4-quick-fix.md
│
├── agent-development/
│   ├── agent-specs/
│   │   ├── agent-instructions.md
│   │   ├── application-overview.md
│   │   ├── architecture-breakdown.md        ← You are here
│   │   └── git-workflow.md                  ← Branching, commit conventions, versioning
│   ├── pending/
│   │   └── _TEMPLATE-request.md
│   ├── plans/
│   │   └── _templates/                     ← Templates for creating new plan folders
│   │       ├── manifest.json               ← Task state, stages, context tracking
│   │       ├── specification.md            ← Human-readable plan overview
│   │       └── stage.md                    ← Per-stage instruction template
│   ├── queued/                             ← Approved plan folders ready for execution
│   └── done/
│       ├── plans/                          ← Executed plan folders (archive)
│       ├── requests/
│       └── quick-fixes/                    ← Quick fix log files (YYYYMMDD-description.md)
│
├── .env.example                             ← Git-tracked env template
├── .gitignore
├── Makefile                                 ← Common dev commands (up, down, build, test, etc.)
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── yarn.lock
└── README.md
```

---

## Folder Descriptions

- `/src/main.ts`: Entry point. Bootstraps the NestJS application, applies global pipes and interceptors, binds to the configured port.
- `/src/app.module.ts`: Root module. Imports all feature modules, registers global providers (config, logger, database connection).
- `/src/config/`: Configuration module. Uses `@nestjs/config` with Joi validation. Reads from `.env` and exposes typed config via `ConfigService`. Includes `configuration.ts` (factory function) and `config.module.ts`.
- `/src/books/`: Book feature module. Contains `books.controller.ts` (REST endpoints), `books.service.ts` (business logic), `books.repository.ts` (Mongoose data-access layer), `dto/` (request/response DTOs with `class-validator` decorators), and `schemas/book.schema.ts` (Mongoose schema).
- `/src/shelves/`: Shelf feature module. Same structure as books. Handles shelf CRUD and the relationship between shelves and books via document references.
- `/src/reading-sessions/`: Reading session feature module. Tracks per-book reading progress. Contains calculation logic for completion percentage and estimated finish time.
- `/src/recommendations/`: Recommendation module. Contains `recommendations.service.ts` (analysis + OpenLibrary queries), `recommendations.processor.ts` (BullMQ job handler), and `recommendations.controller.ts` (GET endpoint for current recommendations).
- `/src/common/`: Shared utilities. Includes `filters/` (global exception filter), `interceptors/` (response transform, logging), `pipes/` (custom validation pipe), `decorators/` (custom parameter decorators like `@UserId()`), and `interfaces/` (shared TypeScript interfaces).
- `/src/database/`: Database configuration and migrations. Contains `database.module.ts` (Mongoose connection setup), `migrations/` directory, and `seeds/` for development seed data.
- `/src/external/`: External API clients. `open-library/` subdirectory contains `open-library.service.ts` (HTTP client wrapping OpenLibrary API calls) and `open-library.module.ts`.
- `/test/`: End-to-end tests using `@nestjs/testing` and `supertest`. Each feature module has a corresponding `.e2e-spec.ts` file.
- `/docker/`: Dockerfiles for app and supporting services. `Dockerfile` (app), `docker-compose.yml`, and any init scripts for databases or queues.
- `/user-development/`: Human-facing development assets — prompt templates and the development guide.
- `/agent-development/`: Agent-facing pipeline — pending requests, plans, queued/done work, specs, and templates.
- `/agent-development/agent-specs/`: Project-level specifications (this file, `application-overview.md`, `agent-instructions.md`, and `git-workflow.md`). Read-only context for every agent conversation.

---

## Module Dependency Graph

```
app.module
  └── imports: config, database, books, shelves, reading-sessions, recommendations

books
  └── imports: database, external/open-library

shelves
  └── imports: database, books (for book validation)

reading-sessions
  └── imports: database, books (for book lookup)

recommendations
  └── imports: database, books, external/open-library, BullModule (Redis queue)

external/open-library
  └── imports: HttpModule (@nestjs/axios)

config
  └── imports: (none — global module)

database
  └── imports: config
```

---

## Design Patterns

1. **Modular Architecture (NestJS Modules):** Every feature is encapsulated in its own module with its own controller, service, repository, DTOs, and entities. Modules declare their dependencies explicitly via `imports` and expose functionality via `exports`. This keeps features decoupled and testable in isolation.

2. **Repository Pattern:** Each feature module has a dedicated repository that wraps Mongoose's `Model<T>`. All database queries live here — services never call `mongoose.connection` or use models directly. This allows swapping the persistence layer or mocking database access in unit tests without changing service logic.

3. **DTO Validation:** All incoming request bodies are validated using `class-validator` decorators on DTO classes. The global `ValidationPipe` rejects malformed requests before they reach the controller. Response DTOs use `class-transformer` to control what gets serialized to the client.

4. **Background Jobs (BullMQ):** Long-running or deferrable work (recommendation generation, metadata enrichment retries) is dispatched to a Redis-backed BullMQ queue. Processors run in the same NestJS process but handle jobs asynchronously. Each job type has its own processor class.

5. **Configuration via Environment:** All environment-specific values (database URL, Redis URL, ports, API keys) are loaded from `.env` files via `@nestjs/config`. A Joi schema validates required variables at startup so the app fails fast if config is missing rather than crashing at runtime.

---

## Technology Stack

| Component | Library / Tool |
|---|---|
| Language | TypeScript 5.x (strict mode) |
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10 |
| ODM | Mongoose 8.x (`@nestjs/mongoose`) |
| Database | MongoDB 7 |
| Job Queue | BullMQ + Redis 7 |
| Validation | class-validator, class-transformer |
| Testing | Jest (unit), supertest (e2e) |
| Containerization | Docker, Docker Compose |
| Package Manager | yarn |

---

## Key Architectural Decisions

<!-- 
  This section is a good place to record "why" decisions that aren't obvious 
  from the code alone. Agents benefit from understanding rationale.
-->

- **Mongoose over Prisma/TypeORM:** Chosen for its schema-based approach which pairs naturally with MongoDB's document model and NestJS's `@nestjs/mongoose` integration. Schemas and models are defined with decorators, keeping the style consistent with the rest of the NestJS codebase. Also provides flexible aggregation pipeline support without leaving the ODM ecosystem.
- **BullMQ over Agenda/cron:** Redis-backed queues provide reliable at-least-once delivery, retry logic, and job visibility (via Bull Board) out of the box. Overkill for a personal project, but a good pattern to have in place from the start.
- **No authentication in this service:** The API sits behind an API gateway that handles auth. This service trusts the `x-user-id` header. This simplifies the codebase but means the service must never be exposed directly to the internet.

---

## Key Conventions

| Convention | Detail |
|---|---|
| **Config files** | `.env.example` is git-tracked; `.env` is gitignored. Copy and fill in values after cloning. |
| **Migrations** | All schema changes go through migrations in `src/database/migrations/`. Never rely on auto-sync outside local dev. |
| **Test files** | Unit tests: `*.spec.ts` alongside source. E2E tests: `test/*.e2e-spec.ts`. |
| **Task numbering** | Sequential across `agent-development/pending/` and `agent-development/done/requests/` combined. |
| **Docker** | `docker-compose.yml` defines all services. `Makefile` wraps common Docker and yarn commands. |