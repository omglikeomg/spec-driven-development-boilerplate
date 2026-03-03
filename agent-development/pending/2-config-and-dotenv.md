# Task 2: Configuration & Environment Management

## Goal

Establish a robust configuration system that loads environment variables from `.env` files, validates them at startup, and exposes a strongly-typed configuration object throughout the application — so that no service ever reads `process.env` directly and missing or malformed config causes an immediate, descriptive startup failure rather than a runtime crash.

## Context

Requires Task 1 (Docker Infrastructure) to be completed first, since the `.env.example` file and Docker environment variable references are established there.

Every non-trivial application needs a config layer that separates environment-specific values (ports, database credentials, API keys, feature flags) from application code. Without this, secrets leak into source files, environment differences cause subtle bugs, and new developers waste time figuring out which variables are required.

This task creates the canonical configuration module that all other modules will depend on for environment-driven values.

## Requirements

- Create a `.env.example` file (or update the one from Task 1) that serves as the single source of truth for all required environment variables. Each variable must include an inline comment explaining its purpose.

- Create a configuration factory function (`src/config/configuration.ts`) that:
  - Reads from `process.env` and returns a nested, typed configuration object.
  - Groups related values (e.g., `database.host`, `database.port`, `redis.host`).
  - Provides sensible defaults for local development so the app works with zero config beyond copying `.env.example` to `.env`.

- Create a Joi validation schema (`src/config/config.validation.ts`) that:
  - Validates every required variable at startup.
  - Coerces types where appropriate (e.g., string `"3000"` → number `3000`).
  - Provides clear error messages when validation fails (e.g., `"DATABASE_URI is required"`).
  - Marks optional variables explicitly with `.optional()` and `.default()`.

- Wire validation into the NestJS `ConfigModule.forRoot()` call so the app refuses to start if validation fails.

- Create a TypeScript interface (`src/config/config.interface.ts`) that defines the shape of the configuration object, enabling type-safe access via `configService.get<DatabaseConfig>('database')` throughout the app.

- Ensure the `.env` file is listed in `.gitignore` but `.env.example` is NOT.

- Support multiple environment files (`.env`, `.env.test`, `.env.production`) via the `envFilePath` option in `ConfigModule.forRoot()`, selected by `NODE_ENV`.

## Implementation Details

1. **`.env.example`:**
   - Must contain every variable referenced in `configuration.ts` with placeholder values.
   - Group variables by section with comment headers (e.g., `# === Database ===`).
   - Example:
     ```
     # === Application ===
     PORT=3000
     NODE_ENV=development

     # === Database (MongoDB) ===
     DATABASE_URI=mongodb://localhost:27017/myapp

     # === Redis ===
     REDIS_HOST=localhost
     REDIS_PORT=6379

     # === External APIs ===
     # OPEN_LIBRARY_BASE_URL=https://openlibrary.org  # optional — defaults to production URL
     ```

2. **`src/config/configuration.ts`:**
   - Export a named function `configuration` (not default export).
   - Return type should match `AppConfig` from `config.interface.ts`.
   - Parse numeric values with `parseInt()` and provide fallback defaults.

3. **`src/config/config.validation.ts`:**
   - Export a Joi `ObjectSchema` named `validationSchema`.
   - Validate: `PORT` (number, default 3000), `NODE_ENV` (enum: development/test/production, default development), `DATABASE_URI` (string, required, must start with `mongodb://` or `mongodb+srv://`), `REDIS_HOST` (string, required), `REDIS_PORT` (number, default 6379).

4. **`src/config/config.interface.ts`:**
   - Define and export interfaces: `AppConfig`, `DatabaseConfig`, `RedisConfig`.
   - `DatabaseConfig` contains a single `uri` field (string).
   - `AppConfig` nests `DatabaseConfig` and `RedisConfig` under `database` and `redis` keys.

5. **`src/config/config.module.ts`:**
   - Import `ConfigModule.forRoot()` with:
     - `isGlobal: true`
     - `load: [configuration]`
     - `validationSchema`
     - `envFilePath` determined by `NODE_ENV` (e.g., `.env.test` when `NODE_ENV=test`)
     - `validationOptions: { abortEarly: true }` to fail fast on the first invalid variable

6. **`.gitignore` update:**
   - Confirm `.env` is ignored.
   - Confirm `.env.test` and `.env.production` are also ignored.
   - Confirm `.env.example` is NOT ignored (add negation `!.env.example` if needed).

## Deliverables

- [ ] `.env.example` with all variables, grouped and commented
- [ ] `src/config/configuration.ts` — typed config factory
- [ ] `src/config/config.validation.ts` — Joi validation schema
- [ ] `src/config/config.interface.ts` — TypeScript interfaces for config shape
- [ ] `src/config/config.module.ts` — NestJS config module wiring
- [ ] `.gitignore` updated to ignore `.env`, `.env.test`, `.env.production` but not `.env.example`

## Agent Checklist

- [ ] `yarn build` compiles with zero TypeScript errors
- [ ] `yarn test` passes (if any config-related tests exist)
- [ ] Removing a required variable from `.env` and running `yarn start` produces a clear Joi validation error (manual verification)
- [ ] `configService.get<DatabaseConfig>('database')` returns a correctly-typed object with all fields populated
- [ ] `.env.example` contains every variable referenced in `configuration.ts` and `config.validation.ts`
- [ ] `.env` is in `.gitignore`; `.env.example` is NOT
- [ ] No source file outside `src/config/` reads from `process.env` directly
- [ ] Update `agent-development/agent-specs/architecture-breakdown.md` if new packages, interfaces, directories, or significant files were introduced
- [ ] Update `README.md` with configuration setup instructions