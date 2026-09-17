# Setup

## Runtime

Use Bun everywhere in this repository.

## Local Stack

```sh
bun install
bun dev                 # postgres (docker) + api + auth + console, schema pushed and seeded
DB=pglite bun dev       # same, with an in-process pglite instead of docker
RESET=1 bun dev         # wipe the docker database first
```

`bun dev` prints the URLs and a seeded API token (`dev@example.com`). Ports: console
5173, api 3000 (routes under `/api`), auth 3002, postgres 5432 — override with `WEB_PORT`,
`API_PORT`, `AUTH_PORT`, `PGPORT`. Details in `scripts/AGENTS.md`.

Talk to it with the CLI, whose `api` command is generated from the OpenAPI spec:

```sh
API_URL=http://localhost:3000/api AGENTS_TOKEN=<seeded token> bun cli api getToken
```

## Full Docker Stack

```sh
bun docker:up           # postgres, migrate, api (8080), auth (3002), console (3000)
bun docker:down
```

See `infra/docker/README.md`.

## Common Commands

```sh
bun run fmt
bun run lint
bun run typecheck
bun test
```

## Data And API Work

```sh
bun --filter '@agents/core' db:push
bun --filter '@agents/core' db:generate
bun run gen             # spec + SDK + fmt
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
