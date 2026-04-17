# Monorepo Layout

## Main Packages

- `packages/core` — shared business logic, DB schema, git-provider integration, actor/context system
- `packages/functions` — Hono API server
- `packages/sdk/ts` — generated TypeScript SDK
- `apps/console` — SvelteKit dashboard
- `apps/cli` — CLI tool
- `actions/*` — reusable workflow actions

## Placement Rules

- domain logic goes in `core`
- routes and webhook handlers go in `functions`
- UI belongs in `apps/console`
- workflow-side collection and emission belongs in `actions`
- generated API clients belong in `packages/sdk/ts`

## Repository-Local Guidance

The root `AGENTS.md` is for repo-specific AI-agent instructions. It should stay short and should not duplicate the main contributor docs.
