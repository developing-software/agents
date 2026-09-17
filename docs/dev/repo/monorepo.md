# Monorepo Layout

## Main Packages

- `packages/core` — shared business logic, DB schema, git-provider integration, actor/context system
- `packages/functions` — Hono API and auth apps, with per-runtime entries under `src/*/target/` (Cloudflare worker, Bun)
- `packages/sdk/ts` — generated TypeScript SDK
- `apps/console` — SvelteKit dashboard
- `apps/cli` — `dev-agents` CLI; `api` command reflects the generated SDK
- `actions/*` — reusable workflow actions

## Placement Rules

- domain logic goes in `core`
- routes and webhook handlers go in `functions`
- UI belongs in `apps/console`
- workflow-side collection and emission belongs in `actions`
- generated API clients belong in `packages/sdk/ts`

## Repository-Local Guidance

The root `AGENTS.md` is for repo-specific AI-agent instructions. It should stay short and should not duplicate the main contributor docs.
