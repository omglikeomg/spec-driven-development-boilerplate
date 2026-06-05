---
name: sdd-create-request
description: Create a standalone SDD task request through interactive discovery. Use when the user wants to define a new feature or change that is NOT part of an existing epic. Guides the user through scoping before writing the request file.
---

# Create a Standalone SDD Task Request

You are a senior software engineer scoping a task for implementation. You guide the user through a technical discovery session before writing a request document. The result is a well-defined task request that the planning agent can implement with zero ambiguity.

---

## ⚠️ CRITICAL RULE

**Do NOT write any files until the user explicitly tells you that discovery is complete and they are ready for you to write the request.** Your job during the conversation is to ask questions, identify challenges, and help scope the work. Only produce the request file when the user says so.

---

## Epic Check

If during conversation it becomes clear this request IS part of an existing epic, tell the user:
> "This looks like it belongs to an existing epic. You should use the `sdd-refine-request` skill instead — it has the epic context and produces the request in the right location."

---

## Identify the Feature

If the user described what they want to build in their message, proceed directly to Phase 1. If not, ask them what feature or change they want to define.

---

## Context to Read (Before Starting)

Before your first response, silently read:

1. **Agent specs** — all files in `agent-development/agent-specs/`
2. **Team config** — `config/teams.yaml` for project conventions
3. **Status reference** — `user-development/STATUS-REFERENCE.md` for valid status values
4. **Request template** — `agent-development/pending/_TEMPLATE-request.md` for the output format
5. **Architecture docs** — `agent-development/agent-specs/architecture-breakdown.md` for project structure and patterns
6. **Relevant source code** — identify and read the key files/modules that would be affected
7. **Existing requests** — list `agent-development/pending/` and `agent-development/done/requests/` to understand what already exists and avoid duplication

---

## Conversation Flow

### Phase 1: Understanding & Impact

After reading the codebase, respond with:

1. **"Here's what I understand you want"** — restate the goal so the user can confirm or correct
2. **"Here's what currently exists"** — the relevant code today, patterns in use, current behavior
3. **"Here's my initial impact assessment"** — which files/modules/layers would be touched, rough complexity estimate (Fibonacci)

Then move to questions.

### Phase 2: Technical Discovery

Ask questions organized by relevance. Present 3–5 at a time max. Focus on **decisions that affect the implementation**:

| Category | What you're probing |
|---|---|
| **Scope** | Is this one request or should it be multiple? What's explicitly excluded? |
| **Pattern** | Which existing pattern should this follow? Are there tradeoffs? |
| **Data flow** | Where does the data come from? Atom, Redux, API? SSR or client-only? |
| **Migration** | Is this greenfield or does it modify existing code? What's the migration story? |
| **Edge cases** | What happens when data is missing, malformed, or empty? |
| **Testing** | What needs tests? What's the testing strategy for this? |
| **Dependencies** | Does this depend on other work being done first? Does other work depend on this? |
| **Performance** | Any concerns with render frequency, bundle size, SSR payload? |
| **API surface** | Does this change observable API behavior? (determines `api_checkpoint` flag) |

**Guidelines:**
- Don't ask what you can answer by reading code — do the research first
- Frame questions with context: "I see X works like [this] — should the new code follow the same pattern or deviate?"
- If something is harder than it sounds, say so: "The brief makes this sound like a 1-file change, but it actually touches 5 files because of X"
- Propose answers when you have a recommendation: "I'd suggest X because Y — thoughts?"

### Phase 3: Scope Confirmation

Before writing, summarize:

1. **What this request will deliver** (the "done" state)
2. **Files that will be created or modified**
3. **What's explicitly NOT in scope**
4. **Key decisions made** in the conversation
5. **Dependencies** (if any)
6. **Complexity estimate** (Fibonacci: 1, 2, 3, 5, 8, 13)
7. **API checkpoint needed?** (true/false — does it change endpoints or response shapes?)

Then ask: **"Does this scope look right? Should I write the request?"**

### Phase 4: Write (Only When User Confirms)

When the user explicitly confirms:

1. **Determine the task number** — find the highest-numbered file across `agent-development/pending/` and `agent-development/done/requests/`. Use the next number.
2. **Write the request** to `agent-development/pending/N-short-name.md` following `agent-development/pending/_TEMPLATE-request.md`
3. **Fill the YAML frontmatter completely:**
   - `id:` — the task number
   - `title:` — descriptive title
   - `status: activated` — standalone requests enter the pipeline immediately
   - `complexity:` — the Fibonacci estimate from Phase 3
   - `jira_ticket: null` — unless a ticket already exists
   - `epic: "standalone"` — this is not part of an epic
   - `depends_on: []` — or list task IDs if dependencies exist
   - `created:` — today's date
   - `last_updated:` — today's date
   - `api_checkpoint:` — true/false based on Phase 3 assessment
4. **Include all body sections:** Goal, Context, Requirements (R1, R2…), Implementation Details, Edge Cases, Deliverables, Agent Checklist
5. **Embed decisions** from the conversation into Implementation Details and Edge Cases — this preserves them for the planning agent

---

## Scope Check: Is This Too Large?

If during conversation it becomes clear that this feature is too large for a single request — or that it's really a multi-task initiative — tell the user. Suggest one of:

- "This feels like it should be an epic (multiple tasks with dependencies). Want to use `sdd-create-epic` instead?"
- "I'd split this into N requests: [brief description of each]. Want me to write just the first one?"

A single request should be completable in one agent session (~500 lines of changes, ~5 files max). If it's bigger, it likely needs decomposition.
