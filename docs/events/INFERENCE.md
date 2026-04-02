# Event Inference

Inference means deriving useful metrics, relationships, and insights from existing event data without adding new instrumentation. Before adding a new event field, check whether the value can be computed from what's already collected.

## Derivable Metrics

These metrics can be computed from existing `agent.result` and `agent.completed` event data.

### Token Efficiency

| Metric | Formula | Source Fields | Use |
|--------|---------|---------------|-----|
| Cost per 1k tokens | `cost_usd / (input_tokens + output_tokens) * 1000` | agent.result.metrics | Compare model cost efficiency |
| Cache hit ratio | `cache_read / (cache_read + input_tokens)` | agent.result.metrics | Measure prompt caching effectiveness |
| Reasoning depth | `reasoning_tokens / output_tokens` | agent.result.metrics | Gauge how much "thinking" a model does |
| Token ratio | `output_tokens / input_tokens` | agent.result.metrics | Detect verbose or terse models |
| Effective input cost | `(input_tokens - cache_read) * per_token_rate` | agent.result.metrics | True cost of new context |

### Run Performance

| Metric | Formula | Source Fields | Use |
|--------|---------|---------------|-----|
| Lines per minute | `(linesAdded + linesRemoved) / (durationMs / 60000)` | agent.completed.data | Measure agent productivity |
| Cost per line changed | `cost_usd / (linesAdded + linesRemoved)` | agent.result + completed | Value per dollar spent |
| Turns per minute | `num_turns / (durationMs / 60000)` | agent.result + completed | Agent interaction speed |
| Check pass rate | `passed / (passed + failed)` per category | agent.completed.data.checks | Quality signal per check type |

### Trend Analysis

These require aggregation over time windows using `Event.list()` with `from`/`to` filters:

| Metric | Method | Use |
|--------|--------|-----|
| Cost trend | Sum `cost_usd` per day/week from agent.result events | Budget monitoring |
| Duration trend | Avg `durationMs` per day/week from agent.completed | Performance regression detection |
| Pass rate trend | Check pass % per week from agent.completed | Quality signal over time |
| Token trend | Sum input+output per day from agent.result | Usage growth tracking |
| Cache effectiveness trend | Avg cache hit ratio per week | Are prompts getting better cached? |

### Comparative Analysis

Group by tags to compare:

| Comparison | Group By | Metrics | Use |
|------------|----------|---------|-----|
| Model vs model | `model:*` tag | cost, tokens, duration, pass rate | Choose best model for workload |
| Harness vs harness | `harness:*` tag | cost, tokens, duration, pass rate | Compare agent implementations |
| Branch activity | `gh:branch:*` tag | event count, lines changed | Identify active development areas |
| Issue complexity | `scope:*` tag | duration, cost, lines changed | Validate scope estimates |

## Event Chain Inference

### Parent Resolution

Events can be chained without explicit `parentEventId` using tag-based inference:

1. **By issue:** Match `gh:repo:` + `gh:issue:` tags to find the root event for an issue
2. **By PR:** Match `gh:repo:` + `gh:pr:` tags to find all events related to a PR
3. **By run:** Match `gh:run:` tag to find all events in a single workflow run

`Event.inferParentEventId()` implements this: it searches for existing events with the same tag combination and returns the most recent match as the parent.

### Tree Queries

`Event.listTree()` uses a recursive CTE to return the full event tree from a root event. This is how the console pairs `agent.result` with `agent.completed` — both share the same parent (`agent.started`).

### Cross-Event Pairing

Some metrics require joining data from multiple events in a chain:

| Want | Need | How |
|------|------|-----|
| Full run summary | agent.result + agent.completed | Both share `parentEventId` pointing to `agent.started` |
| Issue lifecycle | github.issues.opened → agent.completed → github.pull_request.closed | Tag chain via `gh:issue:N` |
| Plan execution | plan events → agent.completed → github.pull_request.reviewed | Tag chain via `plan:ID` |

## Currently Computed (in Console)

The console already computes these from events:

- **Per-agent stats:** count, avg duration, check pass rates (from `agent.completed`)
- **Per-agent metrics:** sum/avg tokens, cost, turns, model distribution (from `agent.result`)
- **Per-run detail:** paired result+completed with PR state lookup
- **Event summary:** aggregated metrics across all runs for a repo

## Not Yet Computed (Opportunities)

These are feasible with existing data but not implemented:

### High Impact

1. **Cost-per-token by model** — group `agent.result` by `model:` tag, compute `cost_usd / total_tokens`. Directly answers "which model gives best value?"

2. **Cache hit ratio dashboard** — `cache_read / (cache_read + input_tokens)` per run, trended over time. Shows whether prompt engineering and caching strategy are improving.

3. **Check flakiness** — for each check name, compute `failure_count / total_count` over a rolling window. Identifies unreliable checks that need attention.

4. **Duration outliers** — flag runs where `durationMs > 2 * avg_duration` for the same agent/model combination. Catches performance regressions.

### Medium Impact

5. **Reasoning token ratio by model** — some models use extended thinking. Compare `reasoning_tokens / output_tokens` across models to understand thinking patterns.

6. **Lines-per-dollar** — `(linesAdded + linesRemoved) / cost_usd`. Crude but useful productivity metric for cost justification.

7. **Origin distribution** — what fraction of runs come from `action` vs `webhook` vs `console`. Pie chart showing how the system is used.

8. **Issue-to-PR cycle time** — time from `github.issues.opened` to `github.pull_request.opened` with matching issue tag. Measures agent response time.

### Low Impact (Nice to Have)

9. **Token budget alerts** — compare daily token sum against a configurable threshold. No new data needed, just a query + notification.

10. **Model migration impact** — when model tag changes for an agent, compare before/after metrics automatically. Answers "did switching models help?"

## Gaps That Block Inference

Some useful inferences are blocked by missing data:

| Blocked Inference | Missing Data | Fix |
|---|---|---|
| Harness crash detection | No event on harness failure before `agent.result` | Emit `agent.failed` in error paths |
| Per-step timing | Only aggregate duration, no step-level events | Emit intermediate events or structured step data |
| Expected vs actual cost | No baseline/budget in event data | Add budget field to agent config or plan |
| Concurrent run ordering | Multiple runs with same parent, no sequence number | Add sequence/attempt field to `agent.started` data |
