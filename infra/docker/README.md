# Docker Compose

A self-contained stack with no SST, Cloudflare, or PlanetScale — just containers. It
coexists with the SST path (`sst.config.ts`, `infra/*.ts`). `bun dev` also reuses its
`postgres` service.

## Services

| Service    | Host port | What it is                                           |
| ---------- | --------- | ---------------------------------------------------- |
| `postgres` | 5432      | Postgres 17, persisted to the `pgdata` volume        |
| `migrate`  | —         | One-shot `drizzle-kit migrate`, then exits           |
| `api`      | 8080      | Hono API (`serve api`), routes under `/api`          |
| `auth`     | 3002      | OpenAuth issuer (`serve auth`)                       |
| `console`  | 3000      | SvelteKit console, adapter-node (`serve console`)    |

The app services share one image (`agents-app`) whose entrypoint is `dev-agents`; each
passes a `serve <target>` verb and waits for `migrate`. `migrate` has its own image
(`agents-migrate`) with a Node binary, because drizzle-kit needs `node:sqlite`.

## Run

```sh
bun docker:up      # copies .env from .env.example if missing, builds, starts detached
bun docker:logs
bun docker:down    # add -v via `bun docker down -v` to drop the volumes
```

`bun docker <args>` proxies to `docker compose -f infra/docker/compose.yml`. Set
`PGPORT` to move the postgres host port if 5432 is taken.

## Probes

Every app service answers the same three, unauthenticated:

| Path        | Probe     | Answers                                                     |
| ----------- | --------- | ----------------------------------------------------------- |
| `/healthz`  | liveness  | the process is up — touches no dependency                   |
| `/readyz`   | readiness | the database answers too; 503 when it doesn't               |
| `/startupz` | startup   | latches on the first good readiness check                   |

Docker allows one probe per container, so `healthcheck` runs `dev-agents health <target>`,
which defaults to `/readyz` — the question `depends_on: service_healthy` asks. The body
lands in `docker inspect` → `State.Health.Log`. On Kubernetes the three map onto
`livenessProbe`, `readinessProbe` and `startupProbe`.

## Notes

- The console is built with `SVELTE_ADAPTER=node`; without it, adapter-auto keeps
  producing the Cloudflare worker SST deploys.
- `.env` is git-ignored and read by Compose at runtime, never baked into the image.
- Re-run migrations with `bun docker run --rm migrate`.
