# Agent Runs

Agent runs execute in [sandboxd](https://github.com/developing-software/sandboxd). The GitHub Actions agent workflows are gone; `actions/*` only collects CI events now.

## Flow

```text
console / POST /agents/dispatch
  └─ AgentDispatch.dispatch            packages/core/src/agent/dispatch.ts
       ├─ Event.create(type: agent)    data.run = { provider: sandboxd, state: queued, baseBranch }
       ├─ installation token + 24h personal API token
       └─ Sandbox.create               packages/core/src/sandbox (libs/sandboxd client)
            image: apps/runner
            env: REPO BRANCH BASE_BRANCH AGENT MODEL PROMPT LLM_BASE_URL AGENTS_API_URL AGENTS_EVENT_ID
            secret_env: LLM_API_KEY GIT_TOKEN AGENTS_API_TOKEN

inside the sandbox (sandboxd-agent entry.sh)
  clone → checkout BRANCH → agents/<agent>.sh
    agent_run: headless agent → agents_report
      report.js: extract metrics → pricing → upload session artifact → commit + push
      └─ POST /agents/runs/{id}/finish → AgentDispatch.finish
           open PR via provider.pulls.create (unless one is open) → complete the event
  then a login shell until idle timeout / stop
```

## Pieces

- `libs/sandboxd`: hey-api client generated from sandboxd's `api/client.yaml` (`bun run gen` in the lib).
- `packages/core/src/sandbox`: `Sandbox.*`. Reads `SANDBOXD_URL`/`SANDBOXD_TOKEN` and sets `X-Sandboxd-Owner` to the actor's workspace.
- `packages/core/src/agent/dispatch.ts`: `AgentDispatch.dispatch | finish | refresh | terminal | end`. Every lookup is scoped to a repository in the actor's workspace.
- `packages/functions/src/api/handler/agent.ts`: `/agents/dispatch`, `/agents/runs/:id/finish`, `/agents/runs/:id/end`.
- `apps/console/src/lib/features/agents/api/run.remote.ts`: terminal link, refresh, and stop for the plan implementation cards.
- `apps/runner`: `FROM sandboxd-agent`. Its `agents/*.sh` source the stock agent files and override `agent_run` to run headless and call the reporter. `src/extractors` read Claude stream-json, Codex rollouts, and OpenCode exports.

## Event Data

`AgentEvent.Completed.Data` keeps the existing `agent`, `workflow` (duration and conclusion), `diff`, `pr`, and `checks` fields, and adds `run`:

```ts
run: { provider: "sandboxd"; id: string | null; state: "queued" | "creating" | "running" | "ended" | null; endedReason: string | null; baseBranch: string | null }
```

`run.state` becomes `ended` when the runner reports, when a sandbox is stopped, or when `refresh` finds that sandboxd ended it. A run that ends without a report is marked `failure`, or `cancelled` if it was stopped.

## Adding An Agent

1. Make sure the sandboxd-agent image ships the harness (`images/agent/agents/<name>.sh` upstream).
2. Add `apps/runner/agents/<name>.sh`: source the stock file, then override `agent_run` with `agents_begin`, a headless run, and `agents_report $?`.
3. Add an extractor in `apps/runner/src/extractors` and register it.
4. Add the name to `AgentDispatch.Agents` and `AgentCompat.config`.
