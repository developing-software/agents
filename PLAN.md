# Plan — Dev Agents

## Current State

### Construction Pipeline (Complete)
- GitHub Actions workflow: issue label triggers agent dispatch
- Agent harnesses: Claude, Codex, OpenCode with metric collection
- Branch creation, PR generation, diff stats
- Event system with parent chaining (`agent.started` -> `agent.result` -> `agent.completed`)
- Artifact upload to R2

### Platform / Observability (Complete)
- Console: repo browser, issue/PR views, workflow triggers, agent config
- API: event ingestion, artifact storage, GitHub webhooks
- Core: actor system, event store, agent discovery, workflow dispatch
- Agent skills and prompts management (`.agents/` folder spec)

### Plan System (Complete)
- Plan entity: CRUD, status lifecycle, tags-based linking, author tracking
- Plan console: list, detail, form, Kanban, create/edit pages
- Structured prompt generation: `Plan.composePrompt()` / `Plan.toPrompt()` with linked issue context
- Dispatch system: multi-agent dispatch via `DispatchDrawer`, prompt preview, status transition to "implementing"
- AI Planner chat: conversational interface with tools for triage, plan creation, issue browsing

### What's Still Missing

```
+----------------------------------------------------------------------+
|                         CURRENT vs TARGET                            |
+----------------------------------------------------------------------+

  CURRENT FLOW (what works now):

    Issues --> Triage (AI chat) --> Plan/PRD --> Approve --> Dispatch --> PR --> Human Review --> Merge
                 ^                    ^           ^           ^
                 |                    |           |           |
              AI planner           LLM draft   human       multi-agent
              tools               + human      gate        dispatch
                                  edit

  STILL MISSING:

    - Completion detection (plan auto-completes when all agents finish)
    - LLM judge (compare competing implementations)
    - Comparison UI (side-by-side view)
    - Metrics dashboard (cycle time, cost, win/loss)
    - Plan API endpoints in Hono (for CLI, SDK, GitHub Actions)
```

---

## Design Decisions

- Plans live in the platform DB (not as repo files)
- Plans can link many issues/artifacts via tags (like the event system)
- File references use relative paths in the markdown body
- Agent runs remain as events (`agent.started`, `agent.result`, `agent.completed`), linked to plans via `plan:{planId}` tag
- No separate join tables — tags handle all relationships

---

## Data Model: Plan Table

Follows the same patterns as the `event` table: tags array with GIN index for relationships, flexible `data` JSON for metadata, ULID primary key.

```
+----------------------------------------------------------------------+
|                           plan table                                 |
+----------------------------------------------------------------------+
|                                                                      |
|  id           ulid        PK                                         |
|  title        text        not null                                   |
|  body         text        not null (markdown, file refs as paths)    |
|  status       text        not null (draft/review/approved/           |
|                                     implementing/completed/rejected) |
|  author_type  text        not null (human/llm)                       |
|  tags         text[]      not null, GIN index                        |
|  data         json        flexible metadata                          |
|  source       text        nullable ("repository")                    |
|  source_id    ulid        nullable (repo id)                         |
|  created_by   ulid        nullable (user id)                         |
|  time_created timestamptz not null, default now()                    |
|  time_updated timestamptz not null, default now()                    |
|  time_deleted timestamptz nullable                                   |
|                                                                      |
+----------------------------------------------------------------------+
|  Indexes:                                                            |
|    plan_tags_gin    GIN (tags)                                       |
|    plan_status_idx  btree (status)                                   |
|    plan_source_idx  btree (source, source_id)                        |
+----------------------------------------------------------------------+
```

### Tag Conventions

Plans and events share the same tag namespace. Searching across both is a query away.

```
  Tag                     Purpose                    Example
  ---------------------------------------------------------------
  gh:repo:owner/name      Which repository           gh:repo:acme/api
  gh:issue:N              Linked issue               gh:issue:42
  gh:pr:N                 Resulting PR               gh:pr:87
  plan:{planId}           Link events to plan        plan:01JV...
  harness:{name}          Agent type used            harness:claude-code
  scope:{label}           Scope classification       scope:small
  type:{label}            Issue type classification  type:bug
```

### How It All Connects

```
+----------------------------------------------------------------------+
|                     RELATIONSHIP MODEL (via tags)                     |
+----------------------------------------------------------------------+

  plan (tags: [gh:repo:acme/api, gh:issue:42, gh:issue:43])
    |
    |  Events reference plans via plan:{id} tag
    |
    +---> event type=agent.started
    |     tags: [plan:01JV..., gh:repo:acme/api, harness:claude-code]
    |       |
    |       +---> event type=agent.result
    |       |     tags: [plan:01JV..., gh:run:789, harness:claude-code]
    |       |
    |       +---> event type=agent.completed
    |             tags: [plan:01JV..., gh:pr:87, harness:claude-code]
    |
    +---> event type=agent.started
          tags: [plan:01JV..., gh:repo:acme/api, harness:codex]
            |
            +---> event type=agent.result
            |     tags: [plan:01JV..., gh:run:790, harness:codex]
            |
            +---> event type=agent.completed
                  tags: [plan:01JV..., gh:pr:88, harness:codex]

  Queries:
    "all events for plan X"      -> WHERE tags @> '{plan:01JV...}'
    "all plans for issue 42"     -> WHERE tags @> '{gh:issue:42}'
    "all plans for repo acme/api"-> WHERE tags @> '{gh:repo:acme/api}'
    "all agent runs for plan X"  -> events WHERE tags @> '{plan:01JV...}'
                                    AND type = 'agent.started'
```

### Plan Status Lifecycle

```
                    +-------+
                    | draft |
                    +---+---+
                        |
           +------------+------------+
           |                         |
           v                         v
      +--------+              +----------+
      | review | -----------> | rejected |
      +---+----+              +----------+
          |
          v
     +----------+
     | approved |
     +----+-----+
          |
          | dispatch agents
          v
  +--------------+
  | implementing |
  +------+-------+
         |
         | PR merged or all rejected
         v
    +-----------+
    | completed |
    +-----------+
```

### Plan Body Format (Markdown with File References)

```markdown
## Scope
Refactor the event API to support batch ingestion.

## Files
- `packages/core/src/events/index.ts` — add `Event.createBatch()`
- `packages/core/src/events/event.sql.ts` — no changes expected
- `packages/functions/src/api/handler/event.ts` — new POST /events/batch
- `packages/functions/src/api/routes.ts` — register batch route

## Acceptance Criteria
- [ ] Batch endpoint accepts array of events
- [ ] Single transaction for all events in batch
- [ ] Returns array of created event IDs
- [ ] Existing single-event endpoint unchanged

## Context
Linked issues describe individual requests for this change.
Agent should read linked issues for additional context.
```

---

## Gap 1: Issue Triage System

**Status:** Partially done — triage via AI planner chat, no automated webhook triage
**Priority:** Medium

### What's Implemented
- Triage tools in AI planner chat (`$lib/ai/tools/triage-tools.ts`)
- LLM-assisted classification via conversational interface
- TriageResult component for displaying results in chat

### What's Still Needed
- **Core module**: `IssueTriage` in `packages/core/src/issue/` for persistent triage logic
- **Automated triage**: Webhook handler for `issues.opened` — auto-classify on arrival
- **GitHub integration**: Bot comment on issue with triage result, label automation
- **Triage queue**: Dedicated console view for unprocessed issues (currently handled via planner chat)

---

## Gap 2: Plan/PRD System

**Status:** Done — core system, console UI, dispatch, and AI planner all implemented
**Priority:** Complete

### What's Implemented

**Core (`packages/core/src/plan/`):**
- `Plan.create()`, `Plan.update()`, `Plan.fromID()`, `Plan.list()` — full CRUD
- `Plan.composePrompt()` / `Plan.toPrompt()` — structured prompt with linked issue content
- Status lifecycle: draft → review → approved → implementing → completed (+ rejected)
- Tags-based linking: `gh:repo:`, `gh:issue:`, `plan:` tags

**Console:**
- Plan list (PlanList), Kanban (PlanKanban), detail (PlanDetail), form (PlanForm)
- Create/edit pages with markdown editor
- Status management and approval workflow
- Dispatch drawer with multi-agent selection, prompt preview, config
- AI planner chat for LLM-assisted plan drafting via conversational interface

**What's Still Needed:**
- Plan API endpoints in Hono (`packages/functions`) — see `.agents/plans/01-plan-api-endpoints.md`
- `Plan.listEvents()` — find events tagged with `plan:{id}` (query exists but no dedicated helper)

---

## Gap 3: Multi-Agent Evaluation ("Merge War")

**Status:** Multi-dispatch done, comparison view + judge not started
**Priority:** High — the comparison view is the core merge war interface

### What's Implemented
- Multi-dispatch via `dispatch.remote.ts` — dispatches same plan to N agents in parallel
- All agent events tagged with `plan:{planId}` for correlation
- Dispatch metadata in `plan.data.dispatched` tracks which agents were sent

### What's Still Needed

**Comparison View (centerpiece):**
- Replaces generic events list on plan detail page when agent runs exist
- Side-by-side table: PR link, lines, tokens, cost, duration, turns, test results, review score
- 1 run → single card with review. 2+ runs → full comparison table
- Winner highlighted after judging. Merged/closed badges after merge

**LLM Judge — Single Implementation Review:**
- "Review" button per agent run — evaluates one PR against plan acceptance criteria
- Emits `github.pull_request.reviewed` event with per-criterion pass/fail, shown inline

**LLM Judge — Compare All Implementations:**
- "Judge All" button (2+ implementations) — compares PRs, ranks, recommends winner
- Emits `plan.evaluated` event with scores, reasoning, verdict rendered as markdown

**Merge Winner:**
- "Merge" button on winning row — merges PR, closes losing PRs, updates plan status

**Metrics (derived from events):**
- Win/loss record per harness type over time
- Cost efficiency (tokens per line of useful code)
- Quality correlation (judge recommendation vs human pick)

---

## Gap 4: Human-in-the-Loop Improvements

**Status:** PR review exists, other gates do not
**Priority:** Medium — improves trust and quality

### What's Needed
- Plan approval gate (human reviews and approves before dispatch)
- Triage confirmation (human validates automated classification)
- Future: post-merge observation and feedback collection

### Implementation Approach

**Plan Approval:**
- Console: approve/reject buttons on plan detail page
- Status change from `review` -> `approved` enables dispatch
- API: `PATCH /plans/:id` with status `approved` or `rejected`
- Event emitted: `plan.approved` or `plan.rejected` (tagged with `plan:{id}`)

**Triage Confirmation:**
- Console: triage queue with confirm/override controls
- Auto-triage creates `github.issue.triaged` event, human confirms via console
- Confirmation emits `issue.triage.confirmed` event
- Unconfirmed triages still visible but flagged in plan linking UI

**Notification System:**
- Plans awaiting review surface in console dashboard
- Optional: GitHub bot comments, Slack notifications, email digest
- Priority queue based on plan age and linked issue urgency

---

## Implementation Sequence

```
+----------------------------------------------------------------------+
|                       IMPLEMENTATION ROADMAP                         |
+----------------------------------------------------------------------+

  Phase A: Plan Foundation ✓ DONE
  +---------------------------------------------+
  |  1. ✓ plan table + migration                |
  |  2. ✓ Plan module in core (CRUD, prompt)    |
  |  3.   Plan API endpoints (Hono) — NOT DONE  |
  |  4. ✓ Plan console pages                    |
  |  5. ✓ Dispatch with plan tags               |
  |  6. ✓ plan:{id} tag on agent events         |
  +---------------------------------------------+
                    |
                    v
  Phase B: Triage + LLM Drafting ✓ MOSTLY DONE
  +---------------------------------------------+
  |  7. ✓ Triage tools in AI planner chat       |
  |  8.   Triage webhook (automated) — NOT DONE |
  |  9.   Triage queue in console — NOT DONE    |
  | 10. ✓ LLM plan drafting via planner chat    |
  | 11. ✓ Plan approval gate in console         |
  +---------------------------------------------+
                    |
                    v
  Phase C: Multi-Agent Evaluation — IN PROGRESS
  +---------------------------------------------+
  | 12. ✓ Multi-dispatch: N agents per plan     |
  | 13.   Single-implementation LLM review      |
  | 14.   Multi-implementation LLM judge        |
  | 15.   Comparison view in console            |
  | 16.   Merge winner + auto-close losers      |
  +---------------------------------------------+
                    |
                    v
  Phase D: Metrics + Observability — NOT STARTED
  +---------------------------------------------+
  | 17.   Metric components ($lib/metrics/)     |
  | 18.   Repo overview uses new components     |
  | 19.   Plan funnel + time range filtering    |
  | 20.   Home dashboard (cross-repo metrics)   |
  | 21.   Logged-out → minimal login page       |
  +---------------------------------------------+
```

### Phase A — Done
Plan entity works end-to-end: create plans in console, link issues via tags, approve, dispatch to agents with `plan:{id}` tag. Remaining: Plan API endpoints in Hono for external consumers (CLI, SDK, Actions).

### Phase B — Mostly Done
AI planner chat handles triage + plan drafting via conversational interface. Remaining: automated webhook triage on `issues.opened`, dedicated triage queue view.

### Phase C — In Progress
Multi-dispatch works. Remaining: single-implementation LLM review, multi-implementation LLM judge (both manual trigger via buttons), comparison UI, merge winner action.

### Phase D — Not Started
Refactor metrics into composable components, enhance repo overview with time range + plan funnel, then build cross-repo home dashboard for logged-in users (replacing the landing page). Logged-out users get a minimal login page.
