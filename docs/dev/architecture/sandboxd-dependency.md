# Depending On sandboxd

How this platform takes [sandboxd](https://github.com/developing-software/sandboxd) as a
dependency, what that costs, and what should change on each side.

Companion to [Rebuilding On sandboxd](./sandboxd-rewrite.md), which covers why. This one
is mechanics.

Both repositories have the same owner. That is the reason this document exists: the
failure mode of owning both sides is not integration friction, it is that our product
concepts leak into a core that was deliberately built not to know them. Half of what
follows is about where to hold the line.

## It Is Four Dependencies

They version independently and break differently. Treating them as one is the first
mistake available.

| Dependency | What | Pinned by |
| --- | --- | --- |
| Contract | `api/client.yaml` | The SDK version that generated from it |
| Code | `@sandboxd/sdk` | Exact version in the root catalog |
| Runtime | A control plane, plus worker hosts | Deployment, not the lockfile |
| Images | `ghcr.io/developing-software/sandboxd-agent` | Digest, never `:latest` |

The third is the one that actually changes this platform. Today we are SST on Cloudflare
Workers with Postgres — no machine we operate. Taking sandboxd means running a control
plane behind TLS with a wildcard DNS name and SQLite state, plus at least one Docker host
that dials out. That is a real operational obligation, and it arrives before any of the
product benefits do.

## sandboxd Is Not Currently Packaged To Be Depended On

`sdk/typescript` is a workspace-internal package wearing a published package's name.

- `"version": "0.1.0"`, no `publishConfig`, and no publish job — `ci.yml` has `go`, `sdk`
  and `ui`, none of which release anything.
- `"exports": { ".": "./src/index.ts" }` with `"files": ["src"]` and `"noEmit": true`. It
  ships TypeScript source and no declarations, so every consumer transpiles it themselves.
- `tsconfig.json` carries `"types": ["bun"]` and `moduleResolution: "bundler"`. Fine
  inside sandboxd's own tree; a hazard for a package that a Cloudflare Workers build has
  to typecheck.
- The npm scope is `@sandboxd` but the org is `developing-software`. GitHub Packages
  requires the scope to match the org, so this is npm-public or a rename — decide once.

None of this is hard, and all of it has to happen before the first `bun add`:

1. A build step emitting `dist/` with `.js` and `.d.ts`, and `exports` pointing at it.
2. Semver with an actual changelog. `api/client.yaml` changing is a minor at least; a
   removed or narrowed field is a major.
3. A release workflow on tag, publishing the SDK.
4. Something to detect skew. `/healthz` returns `{ ok }` today; a version string there, or
   a `/version`, lets us log and alert on a control plane older than the SDK talking to it.

**Skew policy, because `additionalProperties: false` makes it sharp.** Requests refuse
unknown keys. A new SDK field sent to an older control plane is a 400, not a shrug. So
the control plane upgrades first, always, and the SDK bump follows deployment. Write that
down where whoever deploys will read it.

## What We Add On Our Side

- **Catalog entry.** `"@sandboxd/sdk"` in the root `workspaces.catalog`, exact, with
  `catalog:` in `packages/core`. It belongs in core beside the git providers: sandboxd is
  a substrate the domain talks to, not an API-layer concern.
- **Nix input.** Our flake already consumes an external flake through an overlay
  (`llm-agents`). Adding `sandboxd.url = "github:developing-software/sandboxd"` and its
  `overlays.default` puts real `sandboxd-api` and `sandboxd-worker` binaries in the dev
  shell, so `go run ./scripts/dev` is not the only way to develop against it.
- **Token custody.** The service token lives in `packages/functions` and nowhere else.
  The console never holds it. Terminal and preview links are minted per request, after the
  actor check, and expire in 60s and 10min respectively — that shape is already right and
  needs nothing from sandboxd.
- **Owner mapping.** `X-Sandboxd-Owner` is the whole tenancy model there and it is opaque
  to them. Use the workspace ULID. A workspace's members should see each other's runs;
  a user id would make a shared task invisible to the person who has to rescue it.
- **A fake, not a mock of theirs.** From here sandboxd is someone else's boundary, so a
  fake implementing the SDK surface is the right call — which is also sandboxd's own rule,
  read from the other side.

## What The Integration Actually Runs Into

Five things, found by reading their tree rather than their README.

**1. The sandbox deliberately outlives the agent.** `images/agent/entry.sh` ends in
`exec bash -l`. The agent finishing is not the container finishing — that is the point,
since it leaves a person inside the clone with the output still on screen. Consequences:

- A task's completion cannot come from `ended_reason`. It comes from our own callback.
  Polling `ended` is the safety net, not the happy path.
- Nothing reaps the sandbox but the idle timer. We `DELETE` after the callback plus a
  grace window for inspection, or every task holds a slot for 30 minutes.
- The sample worker config is `max_sandboxes: 4`. Three agents against one plan is most of
  a host. `queued` and `queue_position` stop being cosmetic the first week — which is
  exactly why the task table carries them.

**2. There is no post-run hook, and that is the one change worth asking for.** The preset
maps `SETUP`, which runs *before* the agent. Nothing runs after it. But our work has to
leave the sandbox — `git push`, then the callback — and today the stock image cannot do
that. The options are to ship our own image immediately, or to add a `TEARDOWN` twin of
`SETUP` to `entry.sh`: symmetric with what exists, data-only, one preset field, the same
trust boundary the parent app already crosses by choosing the image. With it, phase one
needs no image of ours at all. Highest leverage per line of anything in this document.

**3. The exit code is discarded.** `manager.go` calls
`m.End(m.ctx, box.spec.SID, wire.EndExited, "")` — the detail is empty. The core ran the
command and threw away whether it worked. For our agent image the login shell hides it
anyway, but for `custom` images and for anyone asking "did it succeed", an `exit_code` on
`SandboxView` is small, generic and clearly theirs to own.

**4. `GET /sandboxes` has no filters and no pagination.** It returns every sandbox this
owner has ever had, newest first, unbounded. With one owner per workspace and a reconcile
loop, that is the whole history on every poll. `status`, `since`, `limit` and a cursor.

**5. There is no callback.** Poll-only, and it should probably stay that way for now.
Sandbox lifecycle is genuinely the core's own business, so a `callback_url` would not
violate anything — but delivery means retries, signing and state, in a control plane whose
entire premise is one SQLite file and a static binary. Do (4) first, make polling cheap,
and only buy the webhook if latency actually hurts. If it does, the cheap correct version
is fire-and-forget with a couple of in-process retries and a consumer that still
reconciles.

## Where To Hold The Line

Owning both repositories means every one of these is available to us, and every one of
them is a mistake. `VISION.md` already rules them out; the point is that we are now the
party with the motive to argue otherwise.

| We need | Do not put it in sandboxd | Where it goes |
| --- | --- | --- |
| The run transcript, after the run | Persistent scrollback | Entry script tees it; we upload to R2 by task id, reusing `BranchArtifact` |
| Users' agent tokens | A secret store | Ours to hold. sandboxd keeps `secret_env` pass-through and stores nothing |
| Turns, cost, tokens, diff | Structured agent events | Our callback, against our task id |
| "This one needs 8 cores" | Resource scheduling | Host tags, coarsely — or a machine that fits |
| Plans, tasks, PRs, reviews | Any of these words | Postgres, here |

And do not import `examples/ui`. It is the reference client, standing in for the parent
application. We *are* the parent application. Its presets are a pattern worth copying —
one YAML per preset, fields mapping onto env, the image owning the semantics — and it is
a pattern our `.agents/prompts/*.md` discovery is already halfway to. Copy the idea, take
no dependency.

The test for any proposed sandboxd change: **would a notebook or a preview environment
want it too?** Exit codes, list filters and a teardown hook pass. Everything in the table
above fails.

## Sequence

1. sandboxd: build and publish `@sandboxd/sdk`, semver, release workflow, version in
   `/healthz`. Nothing here can start before this.
2. sandboxd: list filters and pagination; `exit_code`; the `TEARDOWN` hook. Three ADRs.
3. Here: catalog entry, nix input, a `Sandbox` module in `packages/core` beside the git
   providers, and a fake for tests.
4. Here: token custody and owner mapping, with terminal links minted behind the actor check.
5. Stand up one control plane and one worker. Run a task end to end through the stock
   image with `TEARDOWN` doing the push and the callback.
6. Only then decide whether we need an image of our own. Pinned by digest if so, and
   `FROM` theirs, so a new harness stays one `.sh` in their tree and not a fork of it.
