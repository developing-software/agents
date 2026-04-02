# Plan — Dev Agents

## Current State (What Exists)

### Construction Pipeline (Mostly Complete)
- GitHub Actions workflow: issue label triggers agent dispatch
- Agent harnesses: Claude, Codex, OpenCode with metric collection
- Branch creation, PR generation, diff stats
- Event system with parent chaining (`agent.started` -> `agent.result` -> `agent.completed`)
- Artifact upload to R2

### Platform / Observability (Mostly Complete)
- Console: repo browser, issue/PR views, workflow triggers, agent config
- API: event ingestion, artifact storage, GitHub webhooks
- Core: actor system, event store, agent discovery, workflow dispatch
- Agent skills and prompts management (`.agents/` folder spec)

### What's Missing

```
+----------------------------------------------------------------------+
|                         CURRENT vs TARGET                            |
+----------------------------------------------------------------------+

  CURRENT FLOW (what exists):

    Issue (labeled) --> Agent Dispatch --> PR --> Human Review --> Merge
                        ^                        ^
                        |                        |
                     no validation            no tooling
                     no plan                  no comparison
                     raw issue as prompt      manual only

  TARGET FLOW (what we're building):

    Issues --> Triage --> Plan/PRD --> Approve --> Dispatch --> Review --> Merge
                 ^           ^           ^          ^            ^
                 |           |           |          |            |
              validate    LLM draft   human     multi-agent   LLM judge
              classify    + human     gate      compete       + human
              dedup       edit                                decision
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

**Status:** Not started
**Priority:** High — prerequisite for Plan/PRD system

### What's Needed
- Issue classification (bug, feature, task, question)
- Scope estimation (trivial, small, medium, large)
- Validation (is this actionable? duplicate? enough context?)
- Assignment to existing or new Plan

### Implementation Approach

**Triage as Events:**
- Triage results stored as events with type `issue.triaged`
- Tags: `gh:repo:owner/name`, `gh:issue:N`, `type:bug`, `scope:small`
- Data: `{ classification, scope, validation, confidence, reasoning }`
- No separate table — triage is an event that happened to an issue

**Core:**
- `IssueTriage` module in `packages/core/src/issue/`
- LLM-assisted classification (issue title + body + repo context)
- Dedup check against open issues and existing plans
- Validation rules (reproduction steps for bugs, acceptance criteria for features)

**GitHub Integration:**
- Webhook handler for `issues.opened` and `issues.labeled`
- Bot comment on issue with triage result (classification, scope, linked plan)
- Label automation based on classification

**Console:**
- Triage queue view: unprocessed issues sorted by priority
- Manual override controls for classification and scope
- Bulk assign issues to plans

---

## Gap 2: Plan/PRD System

**Status:** Not started
**Priority:** High — core of the new workflow

### What's Needed
- Plan entity (schema above) with tags-based linking
- Two creation paths: LLM plan agent draft and human-authored
- Human review/approval gate before any agent dispatch
- Agent-ready prompt generation from approved plan

### Implementation Approach

**Core:**
- `Plan` module in `packages/core/src/plan/`
- `Plan.create()`, `Plan.update()`, `Plan.approve()`, `Plan.reject()`
- `Plan.addTag()`, `Plan.removeTag()` — manages issue/repo links
- `Plan.toPrompt()` — generates agent-ready prompt from plan body + linked issue context (fetched via tags)
- `Plan.listEvents()` — find all events tagged with `plan:{id}`

**LLM Plan Agent:**
- New GitHub Action or workflow step:
  1. Receives triaged issues (or manual selection from console)
  2. Reads repo context (structure, recent changes, related code)
  3. Drafts plan body with: scope, file references, acceptance criteria
  4. Creates plan entity via API with status `draft`
- Reuses existing agent harness with a "planner" prompt/skill

**Console:**
- Plan list view with status filters (draft, review, approved, implementing)
- Plan editor: edit markdown body, manage tags, change status
- Plan detail view: linked issues (from tags), agent run events, resulting PRs
- Approval workflow: approve button triggers status change + enables dispatch

**API:**
- `POST /plans` — create plan
- `GET /plans` — list (filter by status, tags)
- `GET /plans/:id` — detail (includes linked events via tag query)
- `PATCH /plans/:id` — update body, tags, status
- `POST /plans/:id/dispatch` — trigger agent workflow(s) from approved plan

---

## Gap 3: Multi-Agent Evaluation ("Merge War")

**Status:** Partially exists (multiple harnesses work), needs orchestration
**Priority:** Medium — depends on Plan system

### What's Needed
- Dispatch same plan to N agents (same or different harnesses)
- All agent events tagged with `plan:{planId}` for correlation
- LLM judge that analyzes all implementations and recommends one
- Human reviewer sees comparison summary + individual PRs

### Implementation Approach

**Dispatch:**
- `Plan.dispatch()` accepts list of agent configs (harness, model, prompt variant)
- Creates N parallel workflow runs, each emitting events tagged with `plan:{planId}`
- Each gets its own branch: `pr/plan-{id}-{agent}-{run}`

**LLM Judge:**
- New event type `plan.judged` emitted when all agent runs for a plan complete
- Judge reads all PRs' diffs, metrics, and test results
- Produces comparison report stored as event data + artifact
- Tags: `plan:{planId}`, recommendation in data

**Console:**
- Plan detail view shows all agent runs side-by-side (queried by `plan:{id}` tag)
- Comparison table: lines changed, tokens used, duration, test pass rate
- LLM judge summary displayed prominently
- One-click merge for chosen PR, auto-close others

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
- Auto-triage creates `issue.triaged` event, human confirms via console
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

  Phase A: Plan Foundation
  +---------------------------------------------+
  |  1. plan table + migration (tags, data,     |
  |     status, same patterns as event table)   |
  |  2. Plan module in core (CRUD, tag mgmt,    |
  |     status transitions)                     |
  |  3. Plan API endpoints (create, list, get,  |
  |     update, dispatch)                       |
  |  4. Plan console pages (list, detail, edit, |
  |     approve/reject)                         |
  |  5. Wire dispatch: approved plan triggers   |
  |     existing agent workflow with plan tag   |
  |  6. Add plan:{id} tag to agent workflow     |
  |     events (start/result/completed)         |
  +---------------------------------------------+
                    |
                    v
  Phase B: Triage + LLM Drafting
  +---------------------------------------------+
  |  7. issue.triaged event type + triage logic |
  |  8. Triage webhook (issues.opened)          |
  |  9. Triage queue in console                 |
  | 10. LLM plan drafting agent/prompt          |
  | 11. Plan approval gate in console           |
  +---------------------------------------------+
                    |
                    v
  Phase C: Multi-Agent Evaluation
  +---------------------------------------------+
  | 12. Multi-dispatch: N agents per plan       |
  | 13. plan.judged event + LLM judge action    |
  | 14. Comparison view in console              |
  | 15. Merge winner + auto-close losers        |
  +---------------------------------------------+
                    |
                    v
  Phase D: Metrics + Observability
  +---------------------------------------------+
  | 16. Event tracing: plan -> agent -> PR      |
  | 17. Dashboard (cycle time, cost, win/loss)  |
  | 18. Notification system                     |
  +---------------------------------------------+
```

### Phase A Target
Get the plan entity working end-to-end: create a plan in the console, link issues via tags, approve it, and have it dispatch to the existing agent workflow with a `plan:{id}` tag. Agent events are already captured — adding the plan tag links them. This alone changes the flow from "raw issue -> agent" to "issue -> plan -> approve -> agent".

### Phase B Target
Automate the front of the funnel: issues get triaged on arrival (stored as `issue.triaged` events), LLM drafts plans from triaged issues, humans review and approve. The manual creation path still works.

### Phase C Target
Enable competitive evaluation: same plan dispatched to multiple agents, LLM judge compares results (emits `plan.judged` event), human picks winner. All queryable via `plan:{id}` tag across events.

### Phase D Target
Close the loop: full observability from issue creation to merged PR. Since plans, triage, agent runs, and judgments all share the tag namespace, building dashboards is querying events by tag combinations.
