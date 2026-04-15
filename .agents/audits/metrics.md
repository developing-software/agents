---
title: Metrics Audit
description: Tag system, metric pipeline, and console dashboard consistency
---

Audit the metrics pipeline end-to-end: tag definitions in `packages/core`, tag production in `actions/` and webhook handlers, metric emission from agent harnesses, and console display in `apps/console`.

## What to check

1. **Tag consistency** — Are all produced tags defined in core types? Do all prefixes have console styling? Any orphaned builders or missing prefixes?
2. **Metric pipeline** — Do all harnesses emit the same metric fields? Are emitted metrics represented in EventMetrics/METRIC_KEYS? Any fields emitted but never displayed?
3. **Console coverage** — What `agent` event payload fields aren't shown in any UI? Any TODO/FIXME/HACK in the files you read?

## Rules

- Read-only. Do not modify source files.
- Only write to `.agents/reports/audit-metrics.md`.
- Read `.agents/context/previous-audit-metrics.md` first — skip anything already fixed.
- **Report at most 10 findings.** Prefer fewer, higher-impact items. Cut anything cosmetic or speculative.

## Output

Write `.agents/reports/audit-metrics.md`. For each finding:

```
### [CRITICAL|IMPROVEMENT|SUGGESTION] Title

**Evidence:** `file:line` — what you found
**Impact:** what breaks or is missing

<details><summary>Fix</summary>

- `file` — change needed

Scope: small / medium / large
</details>
```

End with a "Top 3 Opportunities" section — high-value improvements derivable from existing data.
