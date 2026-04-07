# Plan — Dev Agents

## Current State (2026-04-06)

The full lifecycle works end-to-end: issues are triaged via AI planner chat, plans are drafted/approved in the console, multiple agents are dispatched in parallel, competing PRs are reviewed and judged by an LLM, and the winner is merged while losers are auto-closed. Agent runs collect normalized metrics with cost attribution via models.dev pricing, and per-branch check artifacts (lint, typecheck, tests, fallow) are browsable through a Health tab.

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

- **Construction pipeline:** Issue label triggers agent dispatch (Claude, Codex, OpenCode), branch creation, PR generation, artifact upload, idempotent event emission with retries
- **Unified agent action:** Single TypeScript action with pluggable extractors (Claude JSON, Codex JSONL, OpenCode session) replacing the old per-agent shell scripts — graceful degradation, status normalization, shared types with core
- **Pricing & cost attribution:** `Models` namespace in core with longest-prefix-match pricing, `calculateCost()`, SDK exposure (`GET /models/pricing`, `POST /models/cost`), cost backfilled into `agent.completed` events
- **Shared event schema:** `AgentEvent` namespace in `packages/core/src/events/agent/` with Zod schemas (`.catch()` defaults, never throws), `resolveAgent()` alias map, single `parse()` consumed by both action and console
- **PR cost comments:** `actions/comment/` unified action upserts a cost/check summary on PRs via HTML marker, with run history, token breakdown, and check results
- **Branch-scoped check artifacts + Health tab:** Enriched `{ outcome, summary }` check data, R2 branch namespace with `artifact:branch` tag routing, fallow checks (health, dead-code, dupes), Health tab page in console
- **Platform / observability:** Console (repo browser, issues, PRs, agent config, events, health), API (event ingestion, artifacts, webhooks, models pricing), core (actor system, event store, agent discovery)
- **Plan system:** Full CRUD, status lifecycle, tags-based linking, prompt generation, console pages (list, kanban, detail, create/edit), dispatch drawer, AI planner chat
- **Multi-agent evaluation:** Multi-dispatch, comparison view, single-implementation LLM review, multi-implementation LLM judge, merge winner with auto-close losers
- **Runed migration (partial):** `Debounced` in ModelSelector, `TextareaAutosize` + `useMutationObserver` in PlannerChat, `useDebounce` in actions page, hover styles moved to CSS

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

### 5. Typed Events Beyond `agent.completed`

**Priority:** Medium — follows the `AgentEvent.Data` pattern now established

The `AgentEvent` schema is the first typed event; other event types still flow through as untyped `Record<string, unknown>`. Extend the same convention to the rest.

**What's needed:**

- `packages/core/src/events/ci/` — `CiEvent.Data` (check outcomes, durations, run URL)
- `packages/core/src/events/plan/` — `PlanEvent.Data` (evaluated, reviewed, merged)
- `packages/core/src/events/github/` — `GithubEvent.Data` (pull_request, issue lifecycle)
- Update console `*.remote.ts` consumers to use typed `parse()` instead of manual casts

### 6. Finish Runed Migration

**Priority:** Low — 4/5 completed, only Drawer remains

- `packages/console/src/lib/ui/Drawer.svelte` — replace overlay `onclick={close}` with `onClickOutside` from runed (gated on `open` via `$effect`). Keep overlay as non-interactive backdrop if visual contrast is still needed.

### 7. Observability Polish

**Priority:** Low — quality-of-life improvements to existing screens

- Show pricing heuristic (`"models-dev"` vs `"agent-reported"`) as a badge on cost columns so reviewers know where the number came from
- Surface workflow trigger (issue label, manual dispatch, plan re-run) on the event viewer
- Link `agent.completed` rows back to their plan and to the GitHub run URL in a single column

---

## Design Decisions

- Plans live in the platform DB (not as repo files)
- Plans can link many issues/artifacts via tags (like the event system)
- File references use relative paths in the markdown body
- Agent runs are events (`agent.started`, `agent.completed`), linked to plans via `plan:{planId}` tag
- No separate join tables — tags handle all relationships
- LLM judge runs from the console (server-side via `judge.remote.ts`), results stored as events (`github.pull_request.reviewed`, `plan.evaluated`)
- Typed event data lives in `packages/core/src/events/{type}/index.ts` as `{Type}Event.Data` (Zod, `.catch()` defaults, never throws, single `parse()`)
- Check artifacts use a dedicated R2 branch namespace routed via the `artifact:branch` tag — no new upload action
- Check data on events is `{ outcome, summary }` only; rich output lives in the artifact JSON

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
  Then: Metrics + Typed Events
  +---------------------------------------------+
  |  7. Metric components ($lib/metrics/)       |
  |  8. Repo overview with time range + funnel  |
  |  9. Home dashboard (cross-repo metrics)     |
  | 10. CiEvent / PlanEvent / GithubEvent.Data  |
  +---------------------------------------------+
                    |
                    v
  Cleanup
  +---------------------------------------------+
  | 11. Runed: Drawer onClickOutside            |
  | 12. Observability polish (badges, links)    |
  +---------------------------------------------+
```
