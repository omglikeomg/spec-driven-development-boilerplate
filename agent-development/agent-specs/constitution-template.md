---
title: "{repo-name} Engineering Constitution"
version: "1.0"
last_updated: null
---

# Engineering Constitution — {repo-name}

> This is the governing document for all code produced in this repository.
> Every agent session MUST read this before planning or implementing any feature.
> Every PR MUST comply with the principles declared here.
>
> **Replace `{repo-name}` and fill in the sections below.**
> Delete sections that don't apply. Add sections relevant to your tech stack.

---

## 1. Architecture Principles

_What architectural patterns are non-negotiable in this repo?_

-   _(e.g., "All data access goes through the repository pattern — no direct DB queries in controllers")_
-   _(e.g., "API responses use a standard envelope: `{ data, error, meta }`")_
-   _(e.g., "Feature modules are self-contained under `src/features/<name>/`")_

## 2. Testing Standards

_What must every PR include for testing?_

-   _(e.g., "Every new endpoint requires an integration test that hits the actual route")_
-   _(e.g., "Unit test coverage must not decrease for any file touched by this PR")_
-   _(e.g., "Complex business logic requires property-based tests (fast-check / Hypothesis)")_

## 3. Code Quality

_What quality gates apply to every change?_

-   _(e.g., "No `console.log` in production code — use the structured logger")_
-   _(e.g., "No `any` types in TypeScript — use `unknown` or a proper type")_
-   _(e.g., "Functions over 40 lines must explain in a comment why they can't be split")_
-   _(e.g., "All `TODO` comments must reference a ticket ID: `// TODO(PROJ-123): ...`")_

## 4. Security & Compliance

_What security rules are enforced?_

-   _(e.g., "All user input must be validated server-side before reaching business logic")_
-   _(e.g., "Secrets must never be committed — use the secrets manager SDK, not env vars")_
-   _(e.g., "Database queries must use parameterized statements — never string interpolation")_

## 5. Performance

_What performance boundaries exist?_

-   _(e.g., "API endpoints must respond within 200ms at p95 under normal load")_
-   _(e.g., "N+1 queries are forbidden — use eager loading or batch queries")_
-   _(e.g., "Frontend bundle size increase per PR must not exceed 5KB gzipped")_

## 6. Documentation

_What must be documented with every change?_

-   _(e.g., "New API endpoints update the `contracts/` spec file in the hub")_
-   _(e.g., "Architecture changes update `architecture-documentation/` with a numbered doc")_
-   _(e.g., "Environment variable changes update `.env.example` and the runbook")_

## 7. Dependencies & Tooling

_What are the constraints on external dependencies?_

-   _(e.g., "New npm/pip/cargo dependencies must be justified in the PR description")_
-   _(e.g., "Prefer `lodash` utilities already in the project — don't add competing libs")_
-   _(e.g., "Breaking changes to shared packages require a migration guide")_

---

## How Agents Use This Document

1. **Planning:** Before creating `manifest.yaml`, the agent reads this constitution and ensures the plan doesn't violate any principle.
2. **Implementation:** Each stage in the plan should reference which constitutional principles it satisfies or relates to.
3. **Verification:** The verification gate may sample PR diffs against constitution rules (e.g., "this PR adds a new endpoint — does it include an integration test?").
4. **Review:** Human reviewers reference this document when evaluating "does this change belong here?"

---

## Amendment Process

To change this constitution:
1. Propose the change in a PR with the label `constitution-amendment`
2. Get approval from the repo's technical lead
3. Increment the `version` field
4. Add a `last_updated` date

---

_This template lives in the hub at `agent-development/agent-specs/constitution-template.md`.
Copy it into your repo as `sdd/memory/constitution.md` or `docs/CONSTITUTION.md`
and fill in the sections relevant to your tech stack and team standards._
