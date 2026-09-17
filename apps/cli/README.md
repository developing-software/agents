# dev-agents

```sh
bun cli <command>        # from the repo root
dev-agents <command>     # compiled binary or linked bin
```

## API (generated from the spec)

The `api` command reflects the generated `@agents/sdk`, so every endpoint is callable and
new ones show up after `bun run gen`.

```sh
dev-agents api                                  # list callable methods
dev-agents api getToken                         # GET /token
dev-agents api getTokenById --id pat_123
dev-agents api postApp --name "My app" --redirectURI http://localhost/cb
dev-agents api postApp '{"name":"My app","redirectURI":"http://localhost/cb"}'
```

Flags map to call params (`--key value`, `--key=value`, bare `--flag` for `true`); values
that look like numbers/booleans are coerced. `--token` and `--url` configure the client.
Results print as JSON; errors go to stderr with a non-zero exit — pipe into `jq`.

## Events and artifacts

```sh
dev-agents events emit --type checks --repo owner/repo [--parent-event-id ...] [--data '{}'] [--tags a,b]
dev-agents artifacts upload --event-id evt_123 --path ./results [--name report.json]
```

## Auth

```sh
dev-agents login [--provider github] [--issuer ...] [--url ...]
dev-agents logout
```

`login` saves tokens to `$XDG_CONFIG_HOME/dev-agents/config.json`. In CI, set
`AGENTS_TOKEN` instead.

- Token: `--token` › `AGENTS_TOKEN` › saved token › saved OAuth access (auto-refreshed)
- API URL: `--url` › `API_URL` › saved › `https://api.agents.developing.company/api`
- Issuer: `--issuer` › `AUTH_URL` › saved › `https://auth.agents.developing.company`

## Serve and health

```sh
dev-agents serve api        # API_PORT (3000), routes under /api
dev-agents serve auth       # AUTH_PORT (3002)
dev-agents serve console    # PORT (3000), adapter-node build (built if missing)

dev-agents health api                      # /readyz — exit 0 or 1
dev-agents health console --probe live     # /healthz
dev-agents health --url https://x --probe start
```

`serve api|auth` need a reachable `DATABASE_URL`. The exit code of `health` is the answer,
so it is the Docker healthcheck itself — see `infra/docker/README.md`.
