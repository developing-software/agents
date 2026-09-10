# Rebuilding On sandboxd

A design note: what this platform would look like if the agent run were a sandbox
instead of a workflow, and if a task were a row instead of a bag of tags.

This is a proposal, not the current architecture. For what exists today, read
[System Architecture](./system.md) and [Actions And CI](./actions-and-ci.md).

## Where We Are

Dispatch is `workflow_dispatch`. `AgentWorkflow.dispatch()` resolves a repository,
builds a prompt, and triggers `agent-{claude,codex,opencode}.yml` on ref `dev`. It
returns nothing. The console records `{ harness, status: "dispatched" }` and waits
for events to arrive from the other side.

Everything downstream follows from that:

- The run's identity is minted **inside** CI, by `actions/event/init`. The platform
  that dispatched the run cannot name what it dispatched.
- Correlation is reconstructed afterwards from string tags, parsed back out with
  `Tags.Git.*` and `Event.inferParentEventId()`.
- A plan is an `event` row with `type = "plan"` and a JSONB body. There is no plan
  table. There are nine tables and none of them is about work.
- The workflow reaches into the repository with `uses: ./actions/event/init`, a
  relative path. Only a repository carrying this monorepo's `actions/` tree at the
  dispatched ref can run an agent.

## Five Things That Hurt

**1. The identity is minted at the wrong end.** Because CI creates the event id, the
console has no handle between "dispatched" and "an event showed up". No cancel, no
progress, no "it failed to start", no row to hang a retry off.

**2. Tags are an untyped wire format.** `Tags.Git.issue(42)` produces `git:issue:42`.
`agent-claude.yml` line 82 greps for `^gh:issue:\K\d+$`. It never matches, so every
console-dispatched run loses its issue number, and with it the branch name and the
PR link — while the `issue-*.yml` path, which emits `gh:issue:N`, works. Two
vocabularies, one regex, no type checker between them. This is not a bug to fix so
much as the predictable cost of passing domain identity through YAML as text.

**3. The event log is being used as a mutable entity store.** `Plan.update()` reads
an event's `data`, merges a patch, and writes it back. `Plan.list()` fetches events
and filters `status` **in memory**, because status lives inside JSONB. `serialize()`
returns `timeUpdated: event.timeCreated`, so a plan's last-modified time is a lie.
`Identifier.prefixes` still reserves `pln` — nothing mints it. The schema remembers
that plans were meant to be entities.

**4. Onboarding a repository means modifying it.** Workflow files, a vendored
`actions/` tree, `AGENTS_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`, and a `dev` branch. For a
platform whose stated audience is *brownfield repositories*, the price of admission
is a pull request against the repository you wanted to help.

**5. Adding an agent touches five places.** The `AgentWorkflow.Agents` enum, the
`WORKFLOW_FILES` map, `AgentCompat.config`, a new workflow YAML, and the console's
selector. Compare sandboxd, where an agent is one `.sh` in `images/agent/agents/`,
discovered at start-up.

## The Task Table

Tasks are the missing noun, and the reason is not storage. **It is that the
dispatcher, not the runner, should mint the identity.**

```ts
export const taskTable = table(
  "task",
  {
    ...id,                                   // tsk_<ulid>
    ...timestamps,
    workspaceId: ulid("workspace_id").references(() => workspaceTable.id).notNull(),
    repositoryId: ulid("repository_id").references(() => repositoryTable.id).notNull(),
    planId: ulid("plan_id").references(() => planTable.id),
    parentTaskId: ulid("parent_task_id").references((): AnyPgColumn => taskTable.id),
    groupId: ulid("group_id"),               // one dispatch fan-out, for comparison

    kind: text("kind").notNull().$type<TaskKind>(),      // implement | fix | review | audit
    status: text("status").notNull().$type<TaskStatus>(),

    title: text("title").notNull(),
    prompt: text("prompt").notNull(),        // resolved and frozen at dispatch
    agent: text("agent").notNull(),          // free text, not an enum
    model: text("model"),
    issueNumber: integer("issue_number"),
    baseRef: text("base_ref"),
    branch: text("branch"),

    sandboxId: text("sandbox_id"),           // s_ab12cd34
    endedReason: text("ended_reason"),       // sandboxd's, verbatim
    intervenedAt: timestamp("intervened_at"),// a human took the keyboard
    result: jsonb("result").$type<TaskResult>(),

    timeStarted: timestamp("time_started"),
    timeEnded: timestamp("time_ended"),
  },
  (t) => [
    index("task_repository_status_idx").on(t.repositoryId, t.status),
    index("task_plan_idx").on(t.planId),
    index("task_group_idx").on(t.groupId),
    uniqueIndex("task_sandbox_key").on(t.sandboxId),
  ],
);
```

What this buys, in order of how much it matters:

- **A handle that exists before the work does.** `tsk_...` is created, then passed
  into the sandbox as env, then quoted on everything that comes back. No archaeology.
- **Status you can query.** `WHERE repository_id = $1 AND status = 'running'` instead
  of fetching two hundred events and filtering in JavaScript.
- **Fan-out becomes an entity.** Three agents against one plan is three rows sharing
  a `group_id`. `PlanJudge.CompareResult` currently ranks PRs it found by tag; it
  would rank the group it was handed.
- **Retries and fix runs are edges, not guesses.** `parent_task_id` replaces
  `inferParentEventId()` for the one case that matters most.
- **`intervened_at` keeps the metrics honest.** Once a person can take the keyboard
  mid-run (see below), a rescued run and an autonomous one are not the same evidence.
  A platform that ranks agents against each other has to record which is which.

Plans get a real table for the same reasons — indexed status, an honest
`time_updated`, and mutation that does not happen inside an append-only log.

**Events stay, and get better.** They stop being the entity store and become what
they are good at: append-only facts, now with `source = "task"` and
`sourceId = task.id`. Parent inference stops being inference. `Tags.Git.*` keeps
earning its place for the git-side identifiers that genuinely are strings.

## What sandboxd Changes

The swap is narrow: **move the agent run, keep the CI.** Checks, health and PR
webhooks stay exactly where they are. Only the agent's execution leaves GitHub.

| | Today | On sandboxd |
| --- | --- | --- |
| Dispatch | `workflow_dispatch`, returns nothing | `POST /sandboxes` returns `s_...` synchronously |
| Refused work | Discovered when the run fails | `unsatisfiable` at create time |
| Queueing | Actions concurrency, opaque | `queued` with a `queue_position` |
| Status | Inferred from workflow conclusion | `queued/creating/running/ended` |
| Ending | Conclusion string | `closed`, `exited`, `idle`, `failed`, `lost` |
| Cancel | Actions API, best effort | `DELETE /sandboxes/{id}` |
| Watching | Events after the fact | Live PTY, many viewers, replay on attach |
| Intervening | Impossible | Take the keyboard |
| Seeing the result | Read the diff | `POST /preview` — the branch's app, running |
| Target repo needs | Workflows, `actions/`, two secrets, a `dev` ref | A push token |
| New agent | Enum + map + config + YAML + selector | One `.sh` in the image |
| Where it runs | `ubuntu-latest`, 6h cap, cold | Your machines, tag-selected, warm caches |

Three of these are worth more than the rest.

**Onboarding collapses.** A brownfield repository becomes a repository you have a
token for. That is the difference between a tool that works on our monorepo and a
product with users.

**The workflow's plumbing disappears.** `actions/event/{init,data,tag,emit}` exists
to marshal state across step boundaries through `results/data.json` and `tags/*.txt`.
Inside one PTY running one entry script, there are no step boundaries: the script
holds the whole run and posts one payload at the end, quoting its task id. Four
actions and a build pipeline become a shell script. The trade is real and should be
said out loud — sequencing, retries and per-step visibility become yours to write
instead of GitHub's to provide.

**The loop stops being fire-and-forget.** Approve → watch → intervene → let it
finish is a different product from approve → wait → read the PR. It is also the
answer to the failure mode this platform is most exposed to: an agent that went
wrong in minute two and burned twenty more. Rescue beats retry.

And because `AgentEvent.Completed.Data` would then be produced by our own image
posting to our own API against a known task id, it can stop being a wall of
`.catch()` defaults. Bad data becomes a rejected request instead of a silent
`cost_usd: null`.

## What sandboxd Does Not Give Us

Worth stating plainly, because each one is work.

**No callback when a sandbox ends.** The API is poll-only, and structured agent
events are explicitly out of sandboxd's scope. So: the image posts its own
completion, and a cron reconciles — sweep tasks that are `running` whose sandbox is
`ended`, mark them from `ended_reason`. `OriginType` already has `"cron"`; this fits
the existing event model rather than adding machinery beside it.

**No persistent scrollback.** The ring replays for reattach only. If the transcript
is evidence — and for agent comparison it is — the entry script tees it and uploads
it. `BranchArtifact` and R2 already do this shape of work; key it by task id.

**No secret store.** Today GitHub Actions holds the agent tokens. sandboxd forwards
`secret_env` and deliberately never persists it. That custody moves to us: a real
feature, and a real security surface, that CI was quietly providing for free.

**Tags, not resources.** `provider:workers`, `gpu:a100` — placement is trait
matching. "Eight cores" is not expressible.

**One command, one PTY.** No exec-into a running sandbox. The check suite runs
inside the entry script or not at all.

## What To Keep

- The event log and `Tags.Git.*`. The backbone is right; only its second job was wrong.
- The git provider abstraction. Substrate and provider are orthogonal — Forjero
  support does not care where the agent ran.
- `actor`, `VisibleError`, the drizzle helpers. These are not the problem.
- Prompts and presets as discovered data (`.agents/prompts/*.md`). sandboxd reaches
  the same conclusion from the other direction with `preset.yaml`. Push it further:
  the agent list should be data too.

One habit worth stealing outright: sandboxd hand-writes `api/client.yaml` and
generates both the Go server and the TypeScript SDK from it, with CI failing on a
generated diff. We generate the spec *from* zod, which means the contract is a
consequence of the code rather than a thing we agreed to. Theirs catches a breaking
change as a type error; ours reports it after the fact.

## Build Order

1. `task` and `plan` tables, ULID prefixes, backfill from `event` rows.
2. Repoint the console at tasks. Dispatch still fires workflows — nothing about the
   substrate changes yet, and dispatch stops being fire-and-forget on day one.
3. An agent image whose entry script does what the workflow does: clone, branch,
   run, check, commit, push, post the result against `AGENTS_TASK_ID`.
4. Dispatch to sandboxd behind a per-repository flag. Both paths write the same task
   rows and the same events, so they are comparable while both exist.
5. Terminal in the console: the task page attaches to the PTY. Set `intervened_at`
   the first time someone sends a keystroke.
6. Preview links on the task page.
7. Retire `agent-*.yml` and `actions/event/*` once the flag is on everywhere. Keep
   `actions/git/*` and the check actions — CI never moved.
