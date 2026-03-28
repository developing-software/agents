# Dev Agents

Monorepo for reusable GitHub/agent actions and a console to track GitHub and agent activity — collecting metrics and traces for analysis.

When proposing solutions, prefer the simplest approach that matches existing codebase patterns. Check for existing patterns (e.g., Project.get style) before suggesting new abstractions. Do NOT propose complex architectures (sidecars, supervisors, executors) unless explicitly asked.

## Packages

- `packages/core` — shared business logic, DB schema, GitHub integration, actor/context system
- `packages/functions` — Hono API server (port 3000), OpenAPI-documented endpoints
- `packages/console` — SvelteKit dashboard (Cloudflare Workers)
- `packages/cli` — CLI tool
- `packages/sdk/ts` — TypeScript SDK auto-generated from OpenAPI spec
- `actions/implement` — reusable GitHub Action for AI-driven implementation

## Runtime

Use **Bun** everywhere.

- `bun <file>`, `bun test`, `bun install`, `bun run <script>`, `bunx <pkg>`
- `.env` loads automatically
- `Bun.file` for file I/O, `Bun.$\`cmd\`` for shell commands

## Stack

- **API:** Hono (not `Bun.serve` directly)
- **Database:** Postgres via Drizzle ORM with `Bun.sql` — schema in `*.sql.ts` files
- **Auth:** OpenAuth (OAuth) + personal tokens
- **Frontend:** SvelteKit + Tailwind (not React)
- **IDs:** ULIDs

## Key Patterns

**Actor context** — every operation runs under an actor (`user`, `system`, `token`, `public`):

```ts
import { useActor } from "@agents/core/actor";
const actor = useActor();
```

**Errors** — use `VisibleError` for client-safe errors:

```ts
import { VisibleError } from "@agents/core/error";
throw new VisibleError("not_found", 404, "Resource not found");
```

**Database** — use Drizzle via the shared `db` instance:

```ts
import { db } from "@agents/core/drizzle";
```

## Commands

```sh
bun run fmt          # format (oxfmt)
bun run lint         # lint (oxlint)
bun run typecheck    # type check
bun test             # run tests
bun run db:gen       # generate migrations
bun run db:push      # apply migrations
bun run gen:spec     # generate OpenAPI spec (packages/functions)
```
