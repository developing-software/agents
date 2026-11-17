# infra

Four deployment paths, all optional to local development. `alchemy/cf/` is the main one and
`docker/` is supported; [`README.md`](README.md) marks the rest experimental.

| Path         | What                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------- |
| `alchemy/`   | Alchemy v2 (beta). `cf/` is **the main deploy** (`.github/workflows/deploy.yml`), `docker/` mirrors `docker/`. See its `README.md`. |
| `terraform/` | OpenTofu. `envs/cloudflare/` is the same stack as `alchemy/cf`, independently; `envs/aws/` a stub. See its `README.md`. |
| `docker/`    | Self-contained Compose stack. See its `README.md`.                                       |

Both Cloudflare paths reach parity without any application change, because the workers read
their bindings by name — `Hyperdrive`, `Files`, `Jobs`, `AuthKv`, `SEND_EMAIL`, declared in
`packages/functions/src/cf.ts` (the dashboard reads them from `cloudflare:workers`).

Worker bundles keep `cloudflare:*` imports external (postgres.js 4's workerd entry needs
`cloudflare:sockets`).

Services map to `packages/functions/src/*/target/` — `alchemy/cf/` and `terraform/` deploy the
`worker` targets. The `lambda` targets have no deploy path yet. `docker/` and `alchemy/docker/`
run `template-cli serve`, which wires the same providers as the `bun` targets. See
[`docs/runtime.md`](../docs/runtime.md).

## Rules

- **Never deploy.** No `tofu apply`, `tofu destroy`, `alchemy deploy`, `alchemy destroy`, or any
  other infra-mutating command. Prepare the change, then hand the command to the user.
  `tofu fmt`, `tofu validate` and `tofu init -backend=false` are fine — they touch nothing.
- **Never edit `.env`, `.env.example` or `.envrc`.** Name the variables a change needs at
  handoff; the user sets them.
- Adding a secret means adding it to `alchemy/shared.ts` (Alchemy) or `secrets.tf` (Terraform)
  *and* telling the user to export the plain env var / `TF_VAR_`, and to add it to the deploy
  workflow's `env`.
- The Cloudflare paths must not contend for account-scoped names. `terraform/` keeps
  `var.project = "template-tf"` and a `tf.` domain, `alchemy/` the `template-alc` stack name
  and the base domain, and `alchemy/docker/` compose's host ports + 10000, for exactly that reason —
  don't align them "for consistency".
