# System Architecture

The platform is built from four main layers:

- `apps/console` for the operator UI
- `packages/functions` for the HTTP API
- `packages/core` for business logic and shared models
- `actions/*` for CI-side collection and emission
- `apps/runner` for the sandboxd image that runs agents and reports back
- `libs/sandboxd` for the generated sandboxd client

## High-Level Diagram

```text
Issues / Plans
      |
      v
+-------------+      +--------------------+      +------------------+
| apps/console| ---> | packages/functions | ---> |  packages/core   |
| user flows  |      | API + webhooks     |      | domain logic     |
+-------------+      +--------------------+      +------------------+
       ^                         |                          |
       |                         v                          v
       |                +--------------------+      +------------------+
       +----------------|      actions/*     |----->| Postgres / R2    |
                        | emit events/data   |      | persisted state  |
                        +--------------------+      +------------------+
```

## Flow

1. A repository is connected through a git provider.
2. Webhooks and human actions create events.
3. Agents run in sandboxd sandboxes and report structured results back through the API (see `agent-runs.md`).
4. CI actions emit tags, artifacts, and final event data.
5. The console reads those events back as repository, plan, and health views.

## Important Boundaries

- `core` owns normalized git-provider behavior and event semantics.
- `functions` exposes API routes and webhook ingestion.
- `console` is a consumer of repository, plan, event, and health data.
- `actions` are emitters, not the source of truth for domain logic.
