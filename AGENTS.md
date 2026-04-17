# Dev Agents

Repo-specific instructions for AI coding agents working in this monorepo.

## Scope

- `README.md` is the landing page.
- `docs/user/*` is for product and operator docs.
- `docs/dev/*` is for contributor and architecture docs.
- This file should stay short and agent-focused. Do not duplicate the main docs here.

## Working Style

- Prefer the simplest solution that matches existing codebase patterns.
- Check for existing patterns before introducing new abstractions.
- Do not propose sidecars, supervisors, or executors unless explicitly requested.
- When changing behavior, also update the relevant docs under `docs/user/*` or `docs/dev/*`.

## Repo Map

- `packages/core` — domain logic, event model, git-provider integration
- `packages/functions` — API routes and webhook ingestion
- `packages/sdk/ts` — generated TypeScript SDK from OpenAPI
- `apps/console` — SvelteKit operator UI
- `apps/cli` — CLI tool
- `actions/*` — workflow-side collection, tagging, emission, and artifacts

## Stack

- Runtime: Bun or CF Workers depending on the module
- API: Hono or BFF Sveltekit
- Database: Postgres via Drizzle
- Frontend: SvelteKit, not React
- IDs: ULIDs

## Important Patterns

- Use actor-scoped access patterns from `@agents/core/actor`.
- Use `VisibleError` from `@agents/core/error` for client-safe failures.
- Use the shared database helpers in `@agents/core/drizzle`.
- Use `Tags.Git.*` for git-related event tags.
- Keep event parent inference constrained to the same `source` and `sourceId`.
- Keep provider-specific event types where needed, but keep git tag semantics generic.

## Commands

```sh
bun run fmt
bun run lint
bun run typecheck
bun test
bun run db:gen
bun run db:push
bun run gen:spec
```
