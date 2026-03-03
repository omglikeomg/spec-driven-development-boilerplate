# Task 0: Project Bootstrapping & Workspace Setup

## Goal

Initialize the TypeScript project, create the directory hierarchy, install core dependencies, and generate the initial configuration files and README so that subsequent tasks have a working foundation to build on.

## Context

This is the very first task. Before we write any application logic, we need a consistent development environment with the NestJS scaffold, TypeScript configuration, linting, and Docker setup in place. Every future task depends on this foundation being correct.

## Requirements

- Initialize a new NestJS project using the Nest CLI (`nest new`) or manual scaffolding with `yarn`.
- Configure TypeScript in strict mode (`tsconfig.json` with `"strict": true`).
- Create the full directory structure outlined in `agent-development/agent-specs/architecture-breakdown.md`.
- Create placeholder files (empty modules, controllers, services) in each feature directory so that the project compiles without errors.
- Set up the `.env.example` file with all required environment variables (database URL, Redis URL, app port, etc.) using safe placeholder values.
- Create a `Makefile` with at minimum: `up`, `down`, `build`, `test`, `lint` targets.
- Create a `Dockerfile` (multi-stage build) and `docker-compose.yml` with MongoDB, Redis, and the app service.
- Create a `.gitignore` that covers `node_modules/`, `dist/`, `.env`, and IDE files.
- Create an initial `README.md` with: project title, purpose, prerequisites, installation steps, and a reference to the `Makefile` commands.

## Implementation Details

1. **NestJS Scaffold (`/src/main.ts`, `/src/app.module.ts`):**
   - `main.ts` should bootstrap the NestJS app with `app.listen(configService.get('PORT'))`.
   - `app.module.ts` should import `ConfigModule.forRoot({ isGlobal: true })` as the first module.

2. **Config Module (`/src/config/`):**
   - `configuration.ts`: factory function that reads from `process.env` and returns a typed config object.
   - `config.module.ts`: registers the config factory and Joi validation schema.

3. **Database Module (`/src/database/`):**
   - `database.module.ts`: configures Mongoose with connection parameters from `ConfigService`.
   - Create empty `migrations/` and `seeds/` directories.

4. **Feature Modules (`/src/books/`, `/src/shelves/`, `/src/reading-sessions/`, `/src/recommendations/`):**
   - Each gets an empty module, controller, and service file with the correct NestJS decorators.
   - Entity and DTO subdirectories should exist but can contain placeholder files.

5. **Docker (`/docker/`):**
   - `Dockerfile`: multi-stage (build stage with `yarn install && yarn build`, production stage with `node dist/main.js`).
   - `docker-compose.yml`: three services — `app` (port 3000), `mongo` (port 27017), `redis` (port 6379).

## Deliverables

- [ ] `package.json` with NestJS core dependencies, TypeScript, Jest, and dev tooling
- [ ] `tsconfig.json` with strict mode enabled
- [ ] All source directories and placeholder files as defined in `architecture-breakdown.md`
- [ ] `.env.example` with documented placeholder values
- [ ] `Makefile` with `up`, `down`, `build`, `test`, `lint` targets
- [ ] `Dockerfile` and `docker-compose.yml`
- [ ] `.gitignore`
- [ ] `README.md`

## Agent Checklist

- [ ] `yarn install` completes without errors
- [ ] `yarn build` compiles the project with zero TypeScript errors
- [ ] `yarn test` runs (even if no meaningful tests exist yet, the test runner should execute successfully)
- [ ] `docker compose config` validates the compose file without errors
- [ ] All directories listed in `architecture-breakdown.md` exist
- [ ] `.env.example` contains all variables referenced in `src/config/configuration.ts`
- [ ] Update `agent-development/agent-specs/architecture-breakdown.md` if new packages, interfaces, directories, or significant files were introduced
- [ ] Update `README.md` with latest considerations