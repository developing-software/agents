# Setup

## Runtime

Use Bun everywhere in this repository.

## Common Commands

```sh
bun install
bun run fmt
bun run lint
bun run typecheck
bun test
```

## Data And API Work

```sh
bun run db:gen
bun run db:push
bun run gen:spec
```

## Main Packages

- `packages/core`
- `packages/functions`
- `packages/sdk/ts`
- `apps/console`
- `apps/cli`
- `actions/*`

## Notes

- `.env` loads automatically under Bun.
- The repo uses Postgres via Drizzle.
- Frontend work is in SvelteKit, not React.
