# Task 1: Docker Infrastructure & Multi-Container Local Environment

## Goal

Set up a production-ready Docker infrastructure that allows the application and all its supporting services (database, job queue, etc.) to run locally via a single `docker compose up` command, with configurable ports for every service to avoid conflicts with other projects running on the developer's machine.

## Context

Before any application logic is implemented, the local development environment must be reliable and reproducible. Developers should be able to clone the repo, copy the `.env.example`, and have a fully working multi-container stack within minutes. Every service must expose its port through an environment variable so that multiple projects can coexist on the same machine without port collisions.

This task is a prerequisite for any task that requires a running database, cache, or queue.

## Requirements

- Create a `Dockerfile` for the application using a multi-stage build:
  - **Build stage:** Install dependencies, compile TypeScript.
  - **Production stage:** Copy only `dist/` and `node_modules/`, expose the app port, run with `node dist/main`.
  - Include a `.dockerignore` to exclude `node_modules/`, `dist/`, `.git/`, and the `agent-development/`/`user-development/` directories from the Docker build context.

- Create a `docker-compose.yml` that defines at minimum three services:
  - **app** — the NestJS application container, built from the `Dockerfile`. Port mapped via `${APP_PORT:-3000}:3000`. Depends on all other services. Reads environment from `.env`.
  - **mongo** — MongoDB 7. Port mapped via `${DATABASE_PORT:-27017}:27017`. Data persisted to a named volume. Connection URI driven by environment variables.
  - **redis** — Redis 7. Port mapped via `${REDIS_PORT:-6379}:6379`. Used by BullMQ for background job processing.

- All port mappings and credentials must be configurable via environment variables with sensible defaults (so the stack works out of the box with zero configuration, but can be customized).

- Add health checks to the `mongo` and `redis` services so `app` only starts after its dependencies are healthy.

- Create a `docker-compose.override.yml` (git-tracked) that mounts the local `src/` directory into the app container and runs with `yarn start:dev` for hot-reload during development. This override is automatically loaded by Docker Compose when running `docker compose up` locally.

## Implementation Details

1. **`docker/Dockerfile`:**
   - Build stage: `FROM node:20-alpine AS builder`, `WORKDIR /app`, copy `package.json` + `yarn.lock`, `RUN yarn install --frozen-lockfile`, copy source, `RUN yarn build`.
   - Production stage: `FROM node:20-alpine`, copy `dist/`, `node_modules/`, `package.json` from builder. `EXPOSE ${APP_PORT:-3000}`. `CMD ["node", "dist/main"]`.

2. **`docker/docker-compose.yml`:**
   - Use `version: '3.8'` or omit version (modern Compose).
   - Define `app`, `mongo`, `redis` services.
   - `mongo` health check: `mongosh --eval "db.adminCommand('ping')"`.
   - `redis` health check: `redis-cli ping`.
   - `app` depends on both with `condition: service_healthy`.
   - Named volume `mongodata` for MongoDB persistence.

3. **`docker/docker-compose.override.yml`:**
   - Override `app` to use `volumes: ["../src:/app/src"]` and `command: ["yarn", "start:dev"]`.
   - This file IS committed to git (it's the default dev experience). Production deployments should use `docker compose -f docker-compose.yml` explicitly to skip the override.

4. **`docker/.dockerignore`:**
   - Exclude: `node_modules`, `dist`, `.git`, `.env`, `agent-development`, `user-development`, `*.md`, `test`.

## Deliverables

- [ ] `docker/Dockerfile` — multi-stage build
- [ ] `docker/docker-compose.yml` — app + mongo + redis with health checks and configurable ports
- [ ] `docker/docker-compose.override.yml` — dev overrides (volume mount + hot reload)
- [ ] `docker/.dockerignore` — build context exclusions
- [ ] `.env.example` updated with all Docker-related variables (`APP_PORT`, `DATABASE_URI`, `DATABASE_PORT`, `REDIS_PORT`, `REDIS_HOST`)

## Agent Checklist

- [ ] `docker compose -f docker/docker-compose.yml config` validates without errors
- [ ] `docker compose -f docker/docker-compose.yml -f docker/docker-compose.override.yml config` validates without errors
- [ ] All port mappings use environment variables with defaults (grep for hardcoded ports — there should be none in compose files)
- [ ] Health checks are defined for `mongo` and `redis`
- [ ] `app` service has `depends_on` with `condition: service_healthy` for both dependencies
- [ ] `.env.example` contains every environment variable referenced in the compose files
- [ ] `.dockerignore` exists and excludes `node_modules`, `dist`, `.git`
- [ ] Update `agent-development/agent-specs/architecture-breakdown.md` if new packages or interfaces were introduced
- [ ] Update `agent-development/agent-specs/FOLDER-STRUCTURE.md` if new packages or top-level directories were introduced
- [ ] Update `README.md` with Docker setup instructions