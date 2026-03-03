# Stage 2: Directory Structure & Source Placeholders

**Plan:** `0-project-bootstrapping`
**Status:** done
**Last Updated:** 2025-01-15

---

## Objective

Create the full directory hierarchy defined in `architecture-breakdown.md` and populate every module with minimal placeholder files — module, controller, service, entity, and DTO stubs — that compile without errors. After this stage, `yarn build` succeeds and the NestJS application can bootstrap (though it will fail to connect to a database since Docker isn't set up yet).

---

## Resource Constraints (Blast Radius)

> Only the following files/directories may be accessed or modified during this stage.

### Allowed Read Access

| Path | Reason |
|---|---|
| `agent-development/agent-specs/architecture-breakdown.md` | Canonical directory tree, module responsibilities, and design patterns |
| `agent-development/agent-specs/agent-instructions.md` | Naming conventions and NestJS-specific rules |
| `package.json` | Confirm installed dependencies (from Stage 1) |
| `tsconfig.json` | Confirm compiler options |

### Allowed Write Access

| Path | Reason |
|---|---|
| `src/**/*` | All source files are created in this stage |

### Forbidden

- Any file or directory not listed above is **out of scope** for this stage.
- Do NOT modify `package.json` or install new dependencies — everything needed was installed in Stage 1.
- Do NOT create Docker, Makefile, `.env`, `.gitignore`, or test config files — that is Stage 3.

---

## Prerequisites

- [ ] Stage 1 is marked `done` in `manifest.json`
- [ ] `yarn build` is available (i.e., `@nestjs/cli` is installed)

---

## Instructions

### Step 2.1: Create the full directory tree

**Action:** create directories

Run the following to create every directory defined in `architecture-breakdown.md`:

```bash
mkdir -p src/config
mkdir -p src/database/migrations
mkdir -p src/database/seeds
mkdir -p src/books/entities
mkdir -p src/books/dto
mkdir -p src/shelves/entities
mkdir -p src/shelves/dto
mkdir -p src/reading-sessions/entities
mkdir -p src/reading-sessions/dto
mkdir -p src/recommendations
mkdir -p src/external/open-library
mkdir -p src/common/filters
mkdir -p src/common/interceptors
mkdir -p src/common/pipes
mkdir -p src/common/decorators
mkdir -p src/common/interfaces
mkdir -p test
```

---

### Step 2.2: Create the application entry point

**File:** `src/main.ts`
**Action:** create

```typescript
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
  Logger.log(`Application running on port ${port}`, 'Bootstrap');
}

bootstrap();
```

---

### Step 2.3: Create the root application module

**File:** `src/app.module.ts`
**Action:** create

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { BooksModule } from './books/books.module';
import { ShelvesModule } from './shelves/shelves.module';
import { ReadingSessionsModule } from './reading-sessions/reading-sessions.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    BooksModule,
    ShelvesModule,
    ReadingSessionsModule,
    RecommendationsModule,
  ],
})
export class AppModule {}
```

---

### Step 2.4: Create the config module

**File:** `src/config/configuration.ts`
**Action:** create

```typescript
export const configuration = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.DATABASE_URI || 'mongodb://localhost:27017/bookshelf',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
});
```

**File:** `src/config/config.module.ts`
**Action:** create

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configuration } from './configuration';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
  ],
})
export class AppConfigModule {}
```

---

### Step 2.5: Create the database module

**File:** `src/database/database.module.ts`
**Action:** create

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
    }),
  ],
})
export class DatabaseModule {}
```

---

### Step 2.6: Create feature module placeholders

For each feature module (`books`, `shelves`, `reading-sessions`, `recommendations`), create minimal placeholder files that satisfy NestJS's module system. Each module needs at minimum a `.module.ts`, `.controller.ts`, and `.service.ts`.

Repeat the following pattern for each module (example shown for `books`):

**File:** `src/books/books.module.ts`
**Action:** create

```typescript
import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
```

**File:** `src/books/books.controller.ts`
**Action:** create

```typescript
import { Controller } from '@nestjs/common';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}
}
```

**File:** `src/books/books.service.ts`
**Action:** create

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class BooksService {}
```

**File:** `src/books/entities/book.entity.ts`
**Action:** create

```typescript
export class Book {
  // TODO: Add Mongoose schema decorators and fields in a future task
}
```

Apply this same pattern for `shelves`, `reading-sessions`, and `recommendations`. The `recommendations` module also needs an empty `recommendations.processor.ts` placeholder:

```typescript
// src/recommendations/recommendations.processor.ts
export class RecommendationsProcessor {
  // TODO: Implement BullMQ job handler in a future task
}
```

---

### Step 2.7: Create common utilities and external client placeholders

Create stub files for shared infrastructure:

- `src/common/filters/http-exception.filter.ts` — empty class with `@Catch()` decorator
- `src/common/interceptors/logging.interceptor.ts` — empty `NestInterceptor` implementation
- `src/common/interceptors/transform.interceptor.ts` — empty `NestInterceptor` implementation
- `src/common/decorators/user-id.decorator.ts` — `createParamDecorator` that reads `x-user-id` header
- `src/common/interfaces/paginated-response.interface.ts` — generic `PaginatedResponse<T>` interface
- `src/external/open-library/open-library.module.ts` — module importing `HttpModule`
- `src/external/open-library/open-library.service.ts` — injectable service with placeholder methods

All files must contain valid TypeScript that compiles. Empty classes with the correct decorators are fine.

---

## Verification

### Automated Checks

| Command | Expected Result |
|---|---|
| `yarn build` | Exit code 0, no type errors, `dist/` directory populated |
| `find src -type d \| sort` | Matches the directory tree in `architecture-breakdown.md` |

### Manual Verification

- [ ] Every module listed in `architecture-breakdown.md` has at minimum a `.module.ts`, `.controller.ts` (where applicable), and `.service.ts`
- [ ] `src/app.module.ts` imports all feature modules
- [ ] No file contains `any` type or `@ts-ignore` directives
- [ ] All files follow `kebab-case` naming with role suffixes (`.module.ts`, `.service.ts`, etc.)

### Artifacts

- [ ] All output files listed in the manifest for this stage exist and are non-empty
- [ ] No modifications were made outside the blast radius

---

## Rollback Plan

If this stage fails or must be reverted:

1. Delete the entire `src/` directory
2. The project reverts to a compilable-but-empty state from Stage 1
3. Set this stage's `status` to `failed` in `manifest.json`

---

## Notes

- All placeholder schema classes are intentionally plain classes without Mongoose decorators. Schemas will be properly defined in their respective feature tasks.
- The database connection in `database.module.ts` uses a simple URI from config. Migrations will be managed separately in a later task.
- Do NOT add business logic, route handlers, or database queries in this stage. Every service and controller body should be empty.