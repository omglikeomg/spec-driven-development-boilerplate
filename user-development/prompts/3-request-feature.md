# Prompt: Request a New Feature

> **Usage:** Copy this prompt into a new agent conversation. Replace `<FEATURE_DESCRIPTION>` with a plain-language description of the feature you want added to the project.

---

Read all documents in `agent-development/agent-specs/` for project context, then read the relevant source code to understand the current state of the system.

Review existing task requests to understand scope and numbering:

- List all files in `agent-development/pending/`
- List all files in `agent-development/done/requests/`

Create a **new task request** for the following feature:

**→ `<FEATURE_DESCRIPTION>`**

## Rules

1. The request must be consistent with the existing architecture, design patterns, and coding standards.
2. Check both `pending/` and `done/requests/` — do not duplicate existing work. Use the next sequential task number.
3. Follow `agent-development/pending/_TEMPLATE-request.md` exactly as your structural guide.
4. Name the file `N-short-descriptive-name.md` (lowercase kebab-case) and save it in `agent-development/pending/`.
5. Scope correctly — one coherent unit of work per request. If too large, split into multiple sequential requests and explain the dependency chain.
6. Do NOT create a plan or write any code. This prompt is only for writing the request document.