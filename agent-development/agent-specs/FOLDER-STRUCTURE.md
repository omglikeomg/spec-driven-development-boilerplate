# Folder Structure — Quick Reference

<!-- 
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  THIS IS AN EXAMPLE — Replace this entire file with your project's layout  ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
  
  This file gives agents an at-a-glance map of the project so they can orient
  themselves without scanning the filesystem. Keep it updated — stale structure
  docs are worse than no docs at all.
  
  Maintenance rule: If a task adds or removes top-level directories, modules,
  or significant files, update this file as part of the task deliverables.
-->

> **Last updated:** Task 0 — Project Bootstrapping — YYYY-MM-DD
> **Maintenance rule:** If a task adds or removes top-level directories, modules, or significant files, update this file as part of the task deliverables.

---

## Project Root

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
│   │   ├── architecture-breakdown.md
│   │   ├── git-workflow.md                  ← Branching, commit conventions, versioning
│   │   └── FOLDER-STRUCTURE.md              ← You are here
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

## Module Dependency Graph (text summary)

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

## Key Conventions

| Convention | Detail |
|---|---|
| **Config files** | `.env.example` is git-tracked; `.env` is gitignored. Copy and fill in values after cloning. |
| **Migrations** | All schema changes go through migrations in `src/database/migrations/`. Never rely on auto-sync outside local dev. |
| **Test files** | Unit tests: `*.spec.ts` alongside source. E2E tests: `test/*.e2e-spec.ts`. |
| **Task numbering** | Sequential across `agent-development/pending/` and `agent-development/done/requests/` combined. |
| **Docker** | `docker-compose.yml` defines all services. `Makefile` wraps common Docker and yarn commands. |