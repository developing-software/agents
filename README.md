# Dev Agents

Platform-orchestrated AI development lifecycle for brownfield projects. Agents implement focused tasks from approved plans while the platform provides orchestration, observability, and human-in-the-loop gates at every stage.

Inspired by the [AIDLC](https://github.com/awslabs/aidlc-workflows) framework, adapted for monorepo workflows, atomic tasks, and external platform control.

## Human-in-the-Loop Design

Every phase transition requires a human decision. Agents never act autonomously — the platform orchestrates, but humans approve.

| Gate             | Who decides            | What happens                                                       |
| ---------------- | ---------------------- | ------------------------------------------------------------------ |
| Plan approval    | Human                  | `draft → review → approved` — no agent runs without this           |
| Dispatch         | Human                  | Selects agents, models, and triggers execution from the console    |
| Review           | Human and/or LLM       | Scores each PR on adherence, quality, completeness                 |
| Fix dispatch     | Human                  | Sends agent back to fix issues on the same PR branch with feedback |
| Winner selection | Human and/or LLM judge | Picks which competing PR to merge                                  |
| Merge            | Human                  | Merges winner, closes losers, completes the plan                   |

The **review/fix loop** is the core iteration cycle: after an agent submits a PR, the reviewer (human or LLM) evaluates it. If issues are found, the human dispatches a fix — the same agent receives the original plan prompt plus review feedback and works on the same branch. This repeats until the PR passes review. Only then does it enter winner comparison.

## Vision

```
+------------------------------------------------------------------+
|               Dev Agents - AI Development Lifecycle               |
|                                                                   |
|  Platform-orchestrated, brownfield-focused, observable            |
|  Atomic tasks from approved plans, multi-agent evaluation         |
+------------------------------------------------------------------+

  +-------------+     +----------------+     +-------------------+
  |  INCEPTION  | --> |  CONSTRUCTION  | --> |      REVIEW       |
  |  (Platform) |     |    (Agents)    |     | (LLM + Humans)    |
  +-------------+     +----------------+     +-------------------+
        |                    |                       |
        v                    v                       v
  +-----------+        +-----------+           +-----------+
  | Triage    |        | Dispatch  |           | LLM Judge |
  | Validate  |        | Execute   |           | PR Review |
  | Plan/PRD  |        | Collect   |           | Merge     |
  +-----------+        +-----------+           +-----------+
        |                    |                       |
        +--------------------+-----------------------+
                             |
                             v
              +-----------------------------+
              |        OBSERVABILITY        |
              |  Console + Events + Metrics |
              +-----------------------------+
```

## Lifecycle Phases

### Phase 1: Inception (Platform-Orchestrated)

Issues are triaged, validated, and grouped into plans. Plans can be authored by humans, drafted by an LLM agent, or both. **Nothing reaches an implementation agent without an approved plan.** The plan lifecycle enforces this: `draft → review → approved → implementing → completed | rejected`. Only humans can move a plan to `approved`.

```
+----------------------------------------------------------------------+
|                  INCEPTION PHASE (Platform-Orchestrated)              |
+----------------------------------------------------------------------+

  Git Provider Issues
  (bug, feature, task)
        |
        v
  +----------------------+
  |    ISSUE TRIAGE      |
  |                      |
  |  - Classification    |
  |  - Scope estimate    |
  |  - Validation        |
  |  - Dedup check       |
  +----------------------+
        |
        | platform groups
        | issues into plan
        v
  +----------------------+      +----------------------+
  |  LLM PLAN AGENT      |      |   HUMAN AUTHOR       |
  |                      |      |                      |
  |  - Draft/edit plan   |      |  - Create plan       |
  |  - Link issues       |      |  - Full control      |
  |  - Scope definition  |      |  - Rich context      |
  |  - Acceptance        |      |  - Link issues       |
  |    criteria          |      |                      |
  +----------------------+      +----------------------+
        |                              |
        +---------------+--------------+
                        |
                        v
              +----------------------+
              |  ★ HUMAN APPROVAL ★  |
              |    (Required Gate)   |
              |                      |
              |  - Edit draft        |
              |  - Refine scope      |
              |  - Set acceptance    |
              |    criteria          |
              |  - Approve / reject  |
              +----------------------+
                      |         |
               approved      rejected
                  |              |
                  v              v
        +----------------+    (end)
        | APPROVED PLAN  |
        |                |
        | - Linked issues|
        | - Clear scope  |
        | - Acceptance   |
        |   criteria     |
        | - Agent-ready  |
        |   prompt       |
        +----------------+
                  |
                  v
            CONSTRUCTION -->
```

### Phase 2: Construction (Agent-Executed)

The platform dispatches one or more agents to implement the same approved plan. Each agent works on its own branch, producing a PR with collected metrics. Multiple agents can compete on the same plan ("merge war") to evaluate different implementations.

```
+----------------------------------------------------------------------+
|                   CONSTRUCTION PHASE (Agent-Executed)                 |
+----------------------------------------------------------------------+

              Approved Plan
                    |
                    v
          +------------------+
          |  AGENT DISPATCH  |
          |  (Human triggers |
          |   from Console)  |
          |                  |
          |  - Select agents |
          |  - Select models |
          |  - Create branch |
          |  - Build prompt  |
          |  - Emit started  |
          +------------------+
                    |
           +--------+--------+
           |        |        |
           v        v        v
      +--------+--------+--------+
      |Agent A |Agent B |Agent C |    <-- "Merge war"
      |Claude  |Codex   |OpenCode|    <-- Same plan,
      |        |        |        |    <-- competing
      +--------+--------+--------+    <-- implementations
           |        |        |
           v        v        v
      +--------+--------+--------+
      | PR #1  | PR #2  | PR #3  |
      | metrics| metrics| metrics|
      +--------+--------+--------+
           |        |        |
           +--------+--------+
                    |
                    v
               REVIEW -->
```

### Phase 3: Review (LLM + Humans)

Each PR is reviewed individually (by an LLM judge, a human, or both), then all reviews are compared to pick a winner. If a review finds issues, the human can dispatch a fix — sending the agent back to the same PR branch with review feedback appended to its prompt. This creates an iterative review/fix loop until the human is satisfied.

```
+----------------------------------------------------------------------+
|                    REVIEW PHASE (LLM + Humans)                       |
+----------------------------------------------------------------------+

      PR #1          PR #2          PR #3
      (Agent A)      (Agent B)      (Agent C)
        |              |              |
        v              v              v
  +-----------------------------------------------+
  |              PER-PR REVIEW                     |
  |                                                |
  |  LLM Review: auto-scores adherence, quality,   |
  |              completeness (1-10 each)          |
  |        OR                                      |
  |  Human Review: manual scores + verdict         |
  |        OR                                      |
  |  Both                                          |
  +-----------------------------------------------+
        |              |              |
        v              v              v
  +-----------+  +-----------+  +-----------+
  | Passes?   |  | Passes?   |  | Passes?   |
  +-----+-----+  +-----+-----+  +-----+-----+
    Yes | No        Yes | No        Yes | No
        |   |           |   |           |   |
        |   v           |   v           |   v
        | +----------+  | +----------+  | +----------+
        | |FIX LOOP  |  | |FIX LOOP  |  | |FIX LOOP  |
        | |          |  | |          |  | |          |
        | | Human    |  | | Human    |  | | Human    |
        | | dispatches  | | dispatches  | | dispatches
        | | fix with |  | | fix with |  | | fix with |
        | | feedback |  | | feedback |  | | feedback |
        | +----+-----+  | +----+-----+  | +----+-----+
        |      |         |      |         |      |
        |      v         |      v         |      v
        | Agent fixes    | Agent fixes    | Agent fixes
        | same branch    | same branch    | same branch
        |      |         |      |         |      |
        |  (re-review)   |  (re-review)   |  (re-review)
        |                |                |
        v                v                v
  +-----------------------------------------------+
  |             COMPARE & PICK WINNER              |
  |                                                |
  |  LLM Judge: ranks all PRs, recommends winner   |
  |        OR                                      |
  |  Human Pick: manual selection with reasoning   |
  +-----------------------------------------------+
                       |
                       v
             +--------------------+
             |   HUMAN MERGES     |
             |                    |
             |  - Merge winner PR |
             |  - Close loser PRs |
             |  - Plan → completed|
             |  - Emit events     |
             +--------------------+
```

## Agents

Three implementation agents are available, each dispatched via GitHub Actions workflow:

| Agent | Workflow | Branch Prefix |
| ----- | -------- | ------------- |
| Claude | `agent-claude.yml` | `claude/` |
| Codex | `agent-codex.yml` | `codex/` |
| OpenCode | `agent-opencode.yml` | `opencode/` |

Each agent receives the same approved plan prompt and works on its own branch, producing a PR with collected metrics.

## Platform Architecture

```
+----------------------------------------------------------------------+
|                   Dev Agents - Platform Architecture                  |
+----------------------------------------------------------------------+

  +-----------------------------+    +-----------------------------+
  |       apps/console          |    |    packages/functions       |
  |     (SvelteKit Dashboard)   |    |    (Hono API Server)        |
  |                             |    |                             |
  |  - Repo browser             |    |  - POST /events            |
  |  - Issue / PR views         |    |  - POST /events/:id/       |
  |  - Agent config + skills    |    |       artifacts             |
  |  - Plan management          |    |  - Provider webhooks        |
  |  - Dispatch drawer          |    |  - Auth (OAuth + tokens)   |
  |  - AI Planner chat          |    |                             |
  |  - Event viewer             |    |                             |
  +-------------+---------------+    +-------------+---------------+
                |                                    |
                +-----------------+------------------+
                                  |
                                  v
                   +-----------------------------+
                   |       packages/core         |
                   |                             |
                   |  - Actor system             |
                   |  - Event store (Postgres)   |
                   |  - Plan system (CRUD,       |
                   |       prompt, lifecycle)    |
                   |  - Git provider clients     |
                   |  - Agent discovery          |
                   |  - Workflow dispatch         |
                   +-----------------------------+
                                  |
                +-----------------+------------------+
                |                                    |
                v                                    v
  +-----------------------------+    +-----------------------------+
  |    GitHub Actions            |    |    Database (Postgres)      |
  |                             |    |                             |
  |  actions/agent              |    |  - events (tags, parent    |
  |       (unified collector)   |    |       chaining, data)       |
  |  actions/comment            |    |  - plans (tags, status,    |
  |       (PR cost summary)     |    |       lifecycle)            |
  |  actions/git/branch,pr      |    |  - repositories             |
  |  actions/event/emit,init    |    |  - users + flags            |
  |  actions/artifact/upload    |    |  - installations            |
  +-----------------------------+    +-----------------------------+
```

## Monorepo Structure

```
agents/
  apps/
    console/        SvelteKit dashboard (Cloudflare Workers)
    cli/            CLI tool
  packages/
    core/           Shared business logic, DB schema, git-provider integration
    functions/      Hono API server (OpenAPI-documented endpoints)
    workers/        Cloudflare Workers build/deployment
    sdk/ts/         TypeScript SDK (auto-generated from OpenAPI spec)
  actions/
    core/           Shared action utilities
    agent/          Unified agent metrics collector (claude/codex/opencode extractors)
    comment/        Upsert PR cost/check summary comment
    git/
      branch/       Branch creation
      commit/       Commit with metadata
      pr/           Pull request creation
    event/
      emit/         Post events to the Agents API
      init/         Initialize event context
      data/         Attach data to events
      tag/          Tag management for events
    artifact/
      upload/       Upload artifacts to R2 storage
  .agents/
    plans/          Implementation plans for this repo
    skills/         Agent skill definitions
```

## Tech Stack

- **Runtime:** Bun or CF Workers
- **API:** Hono + OpenAPI
- **Database:** Postgres via Drizzle ORM
- **Auth:** OpenAuth (OAuth) + personal tokens
- **Frontend:** SvelteKit + Tailwind
- **CI/CD:** GitHub Actions
- **Hosting:** Cloudflare Workers
- **IDs:** ULIDs

## Development

```sh
bun install          # install dependencies
bun run fmt          # format (oxfmt)
bun run lint         # lint (oxlint)
bun run typecheck    # type check
bun test             # run tests
```
