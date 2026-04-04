# Dev Agents

Platform-orchestrated AI development lifecycle for brownfield projects. Agents implement focused tasks from approved plans while the platform provides orchestration, observability, and human-in-the-loop gates at every stage.

Inspired by the [AIDLC](https://github.com/awslabs/aidlc-workflows) framework, adapted for monorepo workflows, atomic tasks, and external platform control.

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

Issues are triaged, validated, and grouped into plans. Plans can be authored by humans, drafted by an LLM agent, or both. Nothing reaches an implementation agent without an approved plan.

```
+----------------------------------------------------------------------+
|                  INCEPTION PHASE (Platform-Orchestrated)              |
+----------------------------------------------------------------------+

  GitHub Issues
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
              |    HUMAN REVIEW      |
              |                      |
              |  - Edit draft        |
              |  - Approve / reject  |
              |  - Refine scope      |
              +----------------------+
                        |
                        | approved
                        v
              +----------------------+
              |   APPROVED PLAN      |
              |                      |
              |  - Linked issues     |
              |  - Clear scope       |
              |  - Acceptance        |
              |    criteria          |
              |  - Agent-ready       |
              |    prompt            |
              +----------------------+
                        |
                        v
                  CONSTRUCTION -->
```

### Phase 2: Construction (Agent-Executed)

The platform dispatches one or more agents to implement the same plan. Each agent works on its own branch, producing a PR with collected metrics. Multiple agents can compete on the same plan ("merge war") to evaluate different implementations.

```
+----------------------------------------------------------------------+
|                   CONSTRUCTION PHASE (Agent-Executed)                 |
+----------------------------------------------------------------------+

              Approved Plan
                    |
                    v
          +------------------+
          |  AGENT DISPATCH  |
          |  (Platform)      |
          |                  |
          |  - Select agents |
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

An LLM judge analyzes all competing implementations, summarizes differences, and recommends a preferred PR. The human reviewer uses this analysis alongside their own judgment to approve and merge.

```
+----------------------------------------------------------------------+
|                    REVIEW PHASE (LLM + Humans)                       |
+----------------------------------------------------------------------+

      PR #1          PR #2          PR #3
      (Agent A)      (Agent B)      (Agent C)
        |              |              |
        +--------------+--------------+
                       |
                       v
             +--------------------+
             |    LLM JUDGE       |
             |                    |
             |  - Compare all PRs |
             |  - Diff analysis   |
             |  - Quality scoring |
             |  - Recommend pick  |
             +--------------------+
                       |
                       | summary + recommendation
                       v
             +--------------------+
             |   HUMAN REVIEWER   |
             |                    |
             |  - Review code     |
             |  - Read LLM summary|
             |  - Final decision  |
             |  - Merge winner    |
             +--------------------+
                       |
                       | merged
                       v
             +--------------------+
             |    POST-MERGE      |
             |                    |
             |  - Close linked    |
             |    issues          |
             |  - Close losing PRs|
             |  - Emit events     |
             |  - Collect final   |
             |    metrics         |
             +--------------------+
```

## Platform Architecture

```
+----------------------------------------------------------------------+
|                   Dev Agents - Platform Architecture                  |
+----------------------------------------------------------------------+

  +-----------------------------+    +-----------------------------+
  |     packages/console        |    |    packages/functions       |
  |     (SvelteKit Dashboard)   |    |    (Hono API Server)        |
  |                             |    |                             |
  |  - Repo browser             |    |  - POST /events            |
  |  - Issue / PR views         |    |  - POST /events/:id/       |
  |  - Agent config + skills    |    |       artifacts             |
  |  - Plan management          |    |  - GitHub webhooks          |
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
                   |  - GitHub API client        |
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
  |  actions/agent/claude       |    |  - events (tags, parent    |
  |  actions/agent/codex        |    |       chaining, data)       |
  |  actions/agent/opencode     |    |  - plans (tags, status,    |
  |  actions/git/branch,pr      |    |       lifecycle)            |
  |  actions/event/emit,init    |    |  - repositories             |
  |  actions/comment/create     |    |  - users + flags            |
  |  actions/artifact/upload    |    |  - installations            |
  +-----------------------------+    +-----------------------------+
```

## Monorepo Structure

```
agents/
  packages/
    core/           Shared business logic, DB schema, GitHub integration
    functions/      Hono API server (OpenAPI-documented endpoints)
    console/        SvelteKit dashboard (Cloudflare Workers)
    workers/        Cloudflare Workers build/deployment
    cli/            CLI tool
    sdk/ts/         TypeScript SDK (auto-generated from OpenAPI spec)
  actions/
    core/           Shared action utilities
    agent/
      claude/       Claude Code agent harness
      codex/        Codex agent harness
      opencode/     OpenCode agent harness
    git/
      branch/       Branch creation
      commit/       Commit with metadata
      pr/           Pull request creation
    event/
      emit/         Post events to the Agents API
      init/         Initialize event context
      data/         Attach data to events
      tag/          Tag management for events
    comment/
      create/       Create GitHub comments
      update/       Update GitHub comments
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

Name: Codex
