# Architecture Breakdown & Design Patterns

<!-- 
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  THIS IS AN EXAMPLE — Replace this entire file with your project's details ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
  
  This file should describe how your project is organized: folder structure,
  design patterns in use, technology stack, and key architectural decisions.
  
  Be specific — agents will read this to understand where to put new code and
  how existing pieces fit together. The more precise you are, the fewer
  mistakes agents will make.
-->

## Folder Structure

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
- `/agent-development/agent-specs/`: Project-level specifications (this file, `application-overview.md`, `agent-instructions.md`, and `FOLDER-STRUCTURE.md`). Read-only context for every agent conversation.

## Design Patterns

1. **Modular Architecture (NestJS Modules):** Every feature is encapsulated in its own module with its own controller, service, repository, DTOs, and entities. Modules declare their dependencies explicitly via `imports` and expose functionality via `exports`. This keeps features decoupled and testable in isolation.

2. **Repository Pattern:** Each feature module has a dedicated repository that wraps Mongoose's `Model<T>`. All database queries live here — services never call `mongoose.connection` or use models directly. This allows swapping the persistence layer or mocking database access in unit tests without changing service logic.

3. **DTO Validation:** All incoming request bodies are validated using `class-validator` decorators on DTO classes. The global `ValidationPipe` rejects malformed requests before they reach the controller. Response DTOs use `class-transformer` to control what gets serialized to the client.

4. **Background Jobs (BullMQ):** Long-running or deferrable work (recommendation generation, metadata enrichment retries) is dispatched to a Redis-backed BullMQ queue. Processors run in the same NestJS process but handle jobs asynchronously. Each job type has its own processor class.

5. **Configuration via Environment:** All environment-specific values (database URL, Redis URL, ports, API keys) are loaded from `.env` files via `@nestjs/config`. A Joi schema validates required variables at startup so the app fails fast if config is missing rather than crashing at runtime.

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

## Key Architectural Decisions

<!-- 
  This section is a good place to record "why" decisions that aren't obvious 
  from the code alone. Agents benefit from understanding rationale.
-->

- **Mongoose over Prisma/TypeORM:** Chosen for its schema-based approach which pairs naturally with MongoDB's document model and NestJS's `@nestjs/mongoose` integration. Schemas and models are defined with decorators, keeping the style consistent with the rest of the NestJS codebase. Also provides flexible aggregation pipeline support without leaving the ODM ecosystem.
- **BullMQ over Agenda/cron:** Redis-backed queues provide reliable at-least-once delivery, retry logic, and job visibility (via Bull Board) out of the box. Overkill for a personal project, but a good pattern to have in place from the start.
- **No authentication in this service:** The API sits behind an API gateway that handles auth. This service trusts the `x-user-id` header. This simplifies the codebase but means the service must never be exposed directly to the internet.