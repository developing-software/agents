# Event Inference

Inference means deriving useful metrics, relationships, and insights from existing event data without adding new instrumentation. Before adding a new event field, check whether the value can be computed from what's already collected.

## Derivable Metrics

These metrics can be computed from existing `agent` event data.

### Token Efficiency

| Metric               | Formula                                                  | Source Fields            | Use                                    |
| -------------------- | -------------------------------------------------------- | ------------------------ | -------------------------------------- |
| Cost per 1k tokens   | `cost_usd / (tokens.input + tokens.output) * 1000`       | agent.data.agent.metrics | Compare model cost efficiency          |
| Cache hit ratio      | `tokens.cache_read / (tokens.cache_read + tokens.input)` | agent.data.agent.metrics | Measure prompt caching effectiveness   |
| Reasoning depth      | `tokens.reasoning / tokens.output`                       | agent.data.agent.metrics | Gauge how much "thinking" a model does |
| Token ratio          | `tokens.output / tokens.input`                           | agent.data.agent.metrics | Detect verbose or terse models         |
| Effective input cost | `(tokens.input - tokens.cache_read) * per_token_rate`    | agent.data.agent.metrics | True cost of new context               |

### Run Performance

| Metric                | Formula                                              | Source Fields     | Use                           |
| --------------------- | ---------------------------------------------------- | ----------------- | ----------------------------- |
| Lines per minute      | `(linesAdded + linesRemoved) / (durationMs / 60000)` | agent.data        | Measure agent productivity    |
| Cost per line changed | `cost_usd / (linesAdded + linesRemoved)`             | agent.data        | Value per dollar spent        |
| Turns per minute      | `turns / (durationMs / 60000)`                       | agent.data        | Agent interaction speed       |
| Check pass rate       | `passed / (passed + failed)` per category            | agent.data.checks | Quality signal per check type |

### Trend Analysis

These require aggregation over time windows using `Event.list()` with `from`/`to` filters:

| Metric                    | Method                                        | Use                                |
| ------------------------- | --------------------------------------------- | ---------------------------------- |
| Cost trend                | Sum `cost_usd` per day/week from agent events | Budget monitoring                  |
| Duration trend            | Avg `durationMs` per day/week from agent      | Performance regression detection   |
| Pass rate trend           | Check pass % per week from agent              | Quality signal over time           |
| Token trend               | Sum input+output per day from agent           | Usage growth tracking              |
| Cache effectiveness trend | Avg cache hit ratio per week                  | Are prompts getting better cached? |

### Comparative Analysis

Group by tags to compare:

| Comparison         | Group By           | Metrics                           | Use                               |
| ------------------ | ------------------ | --------------------------------- | --------------------------------- |
| Model vs model     | `model:*` tag      | cost, tokens, duration, pass rate | Choose best model for workload    |
| Harness vs harness | `harness:*` tag    | cost, tokens, duration, pass rate | Compare agent implementations     |
| Branch activity    | `git:branch:*` tag | event count, lines changed        | Identify active development areas |
| Issue complexity   | `scope:*` tag      | duration, cost, lines changed     | Validate scope estimates          |

## Event Chain Inference

### Parent Resolution

Events can be chained without explicit `parentEventId` using tag-based inference:

1. **By PR:** Match `git:pr:` tag to find all events related to a PR
2. **By workflow:** Match `git:workflow:` tag to find all events in a single workflow run
3. **By issue:** Match `git:issue:` tag to find the root event for an issue

`Event.inferParentEventId()` implements this: it searches for existing events with the same tag combination and returns the most recent match as the parent. Inference is constrained to the same `source` and `sourceId`, so matching tags in a different repository cannot create parent links.

### Tree Queries

`Event.listTree()` uses a recursive CTE to return the full event tree from a root event. Agent events are single nodes in this tree — one `agent` event per run, linked to its plan/issue/PR parents via tags.

### Cross-Event Pairing

Some metrics require joining data from multiple events in a chain:

| Want             | Need                                                      | How                                               |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------- |
| Full run summary | agent                                                     | All data (metrics, diff, pr, checks) in one event |
| Issue lifecycle  | github.issues.opened → agent → github.pull_request.closed | Tag chain via `git:issue:N`                       |
| Plan execution   | plan → agent → github.pull_request.reviewed               | Tag chain via `plan:ID`                           |

## Currently Computed (in Console)

The console already computes these from events:

- **Per-agent stats:** count, avg duration, check pass rates (from `agent`)
- **Per-agent metrics:** sum/avg tokens, cost, turns, model distribution (from `agent`)
- **Per-run detail:** agent data with PR state lookup
- **Event summary:** aggregated metrics across all runs for a repo

## Not Yet Computed (Opportunities)

These are feasible with existing data but not implemented:

### High Impact

1. **Cost-per-token by model** — group `agent` events by `model:` tag, compute `cost_usd / total_tokens`. Directly answers "which model gives best value?"

2. **Cache hit ratio dashboard** — `tokens.cache_read / (tokens.cache_read + tokens.input)` per run, trended over time. Shows whether prompt engineering and caching strategy are improving.

3. **Check flakiness** — for each check name, compute `failure_count / total_count` over a rolling window. Identifies unreliable checks that need attention.

4. **Duration outliers** — flag runs where `durationMs > 2 * avg_duration` for the same agent/model combination. Catches performance regressions.

### Medium Impact

5. **Reasoning token ratio by model** — some models use extended thinking. Compare `tokens.reasoning / tokens.output` across models to understand thinking patterns.

6. **Lines-per-dollar** — `(linesAdded + linesRemoved) / cost_usd`. Crude but useful productivity metric for cost justification.

7. **Origin distribution** — what fraction of runs come from `action` vs `webhook` vs `console`. Pie chart showing how the system is used.

8. **Issue-to-PR cycle time** — time from `github.issues.opened` to `github.pull_request.opened` with matching issue tag. Measures agent response time.

### Low Impact (Nice to Have)

9. **Token budget alerts** — compare daily token sum against a configurable threshold. No new data needed, just a query + notification.

10. **Model migration impact** — when model tag changes for an agent, compare before/after metrics automatically. Answers "did switching models help?"

## Gaps That Block Inference

Some useful inferences are blocked by missing data:

| Blocked Inference       | Missing Data                                       | Fix                                              |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Harness crash detection | No event on harness failure before completion      | Write `data.agent.status = "failure"` on error   |
| Per-step timing         | Only aggregate duration, no step-level events      | Emit intermediate events or structured step data |
| Expected vs actual cost | No baseline/budget in event data                   | Add budget field to agent config or plan         |
| Concurrent run ordering | Multiple runs with same parent, no sequence number | Add sequence/attempt field to agent event data   |
