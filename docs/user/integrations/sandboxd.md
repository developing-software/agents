# sandboxd (Agent Runs)

Agents run in [sandboxd](https://github.com/developing-software/sandboxd): one disposable container per run, on hosts you own. Each run clones the repository onto a fresh branch, runs one coding agent (Claude Code, Codex, or OpenCode) through the LiteLLM gateway, then commits, pushes, and opens a pull request.

## What Happens On Dispatch

1. The console (or `POST /api/agents/dispatch`) records an `agent` event right away, tagged with the plan, repo, branch, harness, and model.
2. A sandbox starts from the runner image, with the repository, prompt, gateway, and short-lived credentials.
3. You can watch it live: **Terminal** on the implementation card attaches to the sandbox's PTY.
4. When the agent exits, the runner commits and pushes the branch, reports metrics and cost, and the API opens the PR.
5. The sandbox then idles in a shell until it times out or you **Stop** it.

A sandbox that ends without reporting back (lost host, crash) is marked as a failed run when you **Refresh** the card.

## Configuration

| Variable               | Where       | What                                                                 |
| ---------------------- | ----------- | -------------------------------------------------------------------- |
| `SANDBOXD_URL`         | api/console | sandboxd control plane URL                                           |
| `SANDBOXD_TOKEN`       | api/console | sandboxd service token (secret)                                      |
| `SANDBOXD_AGENT_IMAGE` | api/console | runner image; default `ghcr.io/developing-software/agents-runner:latest` |
| `SANDBOXD_TAGS`        | api/console | comma-separated host tags every run requires (optional)              |
| `AGENTS_API_URL`       | api/console | API URL as reachable from inside a sandbox                           |
| `LLM_BASE_URL`         | api/console | LiteLLM gateway (a trailing `/v1` is fine)                           |
| `LLM_API_KEY`          | api/console | LiteLLM key, forwarded to the sandbox as a secret                    |

Secrets (`LLM_API_KEY`, the git installation token, and a 24h API token for the run) travel in sandboxd's `secret_env`: they are never stored by sandboxd or shown in its API.

## Ownership

Sandboxes are created with the workspace ID as their sandboxd owner, so every member of a workspace sees and can attach to the same runs.

## Models

Model IDs are passed to the gateway unchanged (for example `claude-sonnet-4-6` or `gpt-5-codex`), so they must be names your LiteLLM config serves. Codex only speaks the Responses API; prefer OpenAI models for it.
