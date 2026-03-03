# Stage 1: Project Initialization & TypeScript Config

**Plan:** `0-project-bootstrapping`
**Status:** done
**Last Updated:** 2025-01-15

---

## Objective

Initialize the Node.js project with Yarn Classic, install all core NestJS dependencies and dev tooling, and create the TypeScript and NestJS configuration files. After this stage, the project has a valid `package.json`, all dependencies in `node_modules/`, and TypeScript configured in strict mode — but no source files yet.

---

## Resource Constraints (Blast Radius)

> Only the following files/directories may be accessed or modified during this stage.

### Allowed Read Access

| Path | Reason |
|---|---|
| `agent-development/agent-specs/architecture-breakdown.md` | Technology stack, project root layout, and module dependencies |

### Allowed Write Access

| Path | Reason |
|---|---|
| `package.json` | Project metadata and dependency manifest |
| `yarn.lock` | Auto-generated lockfile from `yarn install` |
| `tsconfig.json` | Root TypeScript configuration (strict mode) |
| `tsconfig.build.json` | Build-specific TS config (excludes tests) |
| `nest-cli.json` | NestJS CLI configuration |

### Forbidden

- Any file or directory not listed above is **out of scope** for this stage.
- Do NOT create any `src/` files — that is Stage 2.
- Do NOT create Docker, Makefile, or `.env` files — that is Stage 3.

---

## Prerequisites

- [ ] Node.js 20 LTS is installed and on `$PATH`
- [ ] Yarn Classic (v1) is installed
- [ ] No existing `package.json` or `node_modules/` in the project root (clean start)

---

## Instructions

### Step 1.1: Initialize the Node.js project

**File:** `package.json`
**Action:** create

Run `yarn init -y` in the project root to generate an initial `package.json`. Then update the `scripts` section:

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix"
  }
}
```

---

### Step 1.2: Install production dependencies

**File:** `package.json` (modified by yarn)
**Action:** modify

```bash
# Core NestJS
yarn add @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config reflect-metadata rxjs

# Mongoose + MongoDB
yarn add @nestjs/mongoose mongoose

# BullMQ + Redis
yarn add @nestjs/bullmq bullmq

# Validation
yarn add class-validator class-transformer

# HTTP client (for OpenLibrary)
yarn add @nestjs/axios axios

# Joi for config validation
yarn add joi
```

---

### Step 1.3: Install dev dependencies

**File:** `package.json` (modified by yarn)
**Action:** modify

```bash
yarn add -D typescript @types/node ts-node ts-loader \
  @nestjs/cli @nestjs/schematics @nestjs/testing \
  jest ts-jest @types/jest supertest @types/supertest \
  eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
```

---

### Step 1.4: Create TypeScript configuration

**File:** `tsconfig.json`
**Action:** create

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

---

### Step 1.5: Create build-specific TypeScript configuration

**File:** `tsconfig.build.json`
**Action:** create

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

---

### Step 1.6: Create NestJS CLI configuration

**File:** `nest-cli.json`
**Action:** create

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

---

## Verification

### Automated Checks

| Command | Expected Result |
|---|---|
| `test -f package.json` | File exists |
| `test -f tsconfig.json` | File exists |
| `test -f tsconfig.build.json` | File exists |
| `test -f nest-cli.json` | File exists |
| `yarn install` | Exit code 0, `node_modules/` populated |
| `npx tsc --version` | Prints TypeScript version (5.x) |

### Manual Verification

- [ ] `package.json` contains all dependencies listed in steps 1.2 and 1.3
- [ ] `package.json` scripts include `build`, `start`, `start:dev`, `test`, `lint`
- [ ] `tsconfig.json` has `"strict": true`
- [ ] `tsconfig.json` has `"emitDecoratorMetadata": true` and `"experimentalDecorators": true` (required by NestJS)

### Artifacts

- [ ] All output files listed in the manifest for this stage exist and are non-empty
- [ ] No modifications were made outside the blast radius

---

## Rollback Plan

If this stage fails or must be reverted:

1. Delete `package.json`, `yarn.lock`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`
2. Delete the `node_modules/` directory
3. Set this stage's `status` to `failed` in `manifest.json`

---

## Notes

- Yarn Classic (v1) was chosen over Yarn Berry per the resolved Open Question Q1 in the specification. Do NOT use `yarn set version berry` or create a `.yarnrc.yml`.
- The `@nestjs/schematics` package is included so that `nest generate` commands work if needed in future tasks, but this stage does not use it.
- `skipLibCheck: true` is intentional — some NestJS-adjacent type definitions have minor conflicts that are safe to ignore. Strict checking applies to our own source code via `strict: true`.