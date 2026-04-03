# Plan — Dev Agents

## Current State (2026-04-03)

The full lifecycle works end-to-end: issues are triaged via AI planner chat, plans are drafted/approved in the console, multiple agents are dispatched in parallel, competing PRs are reviewed and judged by an LLM, and the winner is merged while losers are auto-closed.

```
  WORKING FLOW:

    Issues --> Triage (AI chat) --> Plan/PRD --> Approve --> Dispatch --> PR
                                                              |
                                                     N agents in parallel
                                                              |
                                                    Comparison view in console
                                                              |
                                                  LLM review / judge / merge
```

### What's Done

- **Construction pipeline:** Issue label triggers agent dispatch (Claude, Codex, OpenCode), branch creation, PR generation, metric collection, artifact upload
- **Platform / observability:** Console (repo browser, issues, PRs, agent config, events), API (event ingestion, artifacts, webhooks), core (actor system, event store, agent discovery)
- **Plan system:** Full CRUD, status lifecycle, tags-based linking, prompt generation, console pages (list, kanban, detail, create/edit), dispatch drawer, AI planner chat
- **Multi-agent evaluation:** Multi-dispatch, comparison view (`PlanImplementations.svelte`), single-implementation LLM review (`reviewPR`), multi-implementation LLM judge (`judgePlan`), merge winner with auto-close losers (`mergeWinner`)

---

## Next Steps

### 1. Plan API Endpoints (Hono)

**Priority:** High — blocks CLI plan commands, SDK coverage, and GitHub Actions integration

The `Plan` module in core has full CRUD but no Hono handlers expose it. Without these, only the console can manage plans.

**What's needed:**
- `packages/functions/src/api/handler/plan.ts` — new handler
- Routes: `GET /plans`, `GET /plans/:id`, `POST /plans`, `PATCH /plans/:id`, `DELETE /plans/:id`
- Register in `packages/functions/src/api/routes.ts`
- After: regenerate OpenAPI spec (`bun run gen:spec`), rebuild SDK, add `plan` commands to CLI

### 2. Plan Completion Detection

**Priority:** High — plans stay in "implementing" forever without manual intervention

When all dispatched agents finish (all `agent.completed` events received), the plan should auto-transition to "completed" if at least one PR was merged, or stay "implementing" if PRs are still open.

**What's needed:**
- Webhook or event listener that checks plan status when `agent.completed` fires
- Logic: count expected agents (from `plan.data.dispatched`) vs received `agent.completed` events
- Auto-complete only if a PR was merged; otherwise surface "all agents done, awaiting review" state

### 3. Automated Issue Triage

**Priority:** Medium — currently manual via planner chat

**What's needed:**
- `IssueTriage` module in `packages/core/src/issue/` for persistent triage logic
- Webhook handler for `issues.opened` — auto-classify on arrival
- GitHub bot comment on issue with triage result + label automation
- Dedicated triage queue view in console (currently handled via planner chat only)

### 4. Metrics Dashboard

**Priority:** Medium — no visibility into agent performance trends

**What's needed:**
- Composable metric components in `$lib/metrics/` (cost, duration, win/loss, lines changed)
- Repo overview page enhanced with time range filtering + plan funnel visualization
- Home dashboard (cross-repo metrics) for logged-in users
- Logged-out users get a minimal login page (replace current landing)

### 5. README Alignment — Actions Structure

The README monorepo structure lists actions that don't exist (`agent/workflow`, `agent/result`) and is missing ones that do. The actual actions layout:

```
actions/
  core/           Shared action utilities
  agent/
    claude/       Claude Code agent harness
    codex/        Codex agent harness
    opencode/     OpenCode agent harness
  git/
    branch/       Branch creation
    commit/       Commit with metadata
    pr/           Pull request creation
  event/
    emit/         Post events to the Agents API
    init/         Initialize event context
    data/         Attach data to events
    tag/          Tag management for events
  comment/
    create/       Create GitHub comments
    update/       Update GitHub comments
  artifact/
    upload/       Upload artifacts to R2 storage
```

---

## Design Decisions

- Plans live in the platform DB (not as repo files)
- Plans can link many issues/artifacts via tags (like the event system)
- File references use relative paths in the markdown body
- Agent runs are events (`agent.started`,  `agent.completed`), linked to plans via `plan:{planId}` tag
- No separate join tables — tags handle all relationships
- LLM judge runs from the console (server-side via `judge.remote.ts`), results stored as events (`github.pull_request.reviewed`, `plan.evaluated`)

---

## Roadmap

```
  Next: Plan API + Completion Detection
  +---------------------------------------------+
  |  1. Plan API endpoints (Hono)               |
  |  2. Plan completion detection               |
  |  3. CLI plan commands + SDK regen           |
  +---------------------------------------------+
                    |
                    v
  Then: Automated Triage
  +---------------------------------------------+
  |  4. IssueTriage core module                 |
  |  5. Webhook handler for issues.opened       |
  |  6. Triage queue in console                 |
  +---------------------------------------------+
                    |
                    v
  Then: Metrics + Observability
  +---------------------------------------------+
  |  7. Metric components ($lib/metrics/)       |
  |  8. Repo overview with time range + funnel  |
  |  9. Home dashboard (cross-repo metrics)     |
  | 10. Logged-out minimal login page           |
  +---------------------------------------------+
```
