# infra

Deploy paths for the app. None of them is needed for local development (`bun dev`).
[`AGENTS.md`](AGENTS.md) has the layout and the rules for editing them.

## Supported vs experimental paths

| Path              | Status        | What                                                              |
| ----------------- | ------------- | ----------------------------------------------------------------- |
| `alchemy/cf/`     | **Main**      | Alchemy v2 (beta) on Cloudflare Workers + Hyperdrive. CI deploys it. |
| `docker/`         | **Supported** | Self-hosting. Compose stack. See its `README.md`.                 |
| `terraform/`      | Experimental  | OpenTofu, same Cloudflare stack. Its CI and deploy jobs are off.  |
| `alchemy/docker/` | Experimental  | Alchemy v2 (beta) mirror of `docker/`.                            |

Runtime changes are checked against the supported paths only. Experimental paths
may drift (for example `alchemy/docker/` still runs `QUEUE_DRIVER=sync`), so verify
one before deploying it.
