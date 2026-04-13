---
title: Event System Audit
description: Event design, tag/data correctness, chain completeness, and data quality
---

Audit the event system against its design docs. Read these first — they define what correct looks like:

- `docs/events/DESIGN.md` — schema, types, tags vs data rules
- `docs/events/INFERENCE.md` — derivable metrics and gaps

## What to check

1. **Tags vs data** — Check every event emission point against the design doc rules. Tags must be small/categorical/deterministic. Flag: long strings as tags, filterable values buried in data only, numeric metrics as tags, duplication between tags and data.
2. **Event chain** — Do `agent.result`/`agent.completed` events reference their `agent.started` parent? Is information lost between chain steps? Any silent failure paths with no event emitted? Any undocumented event types?
3. **Data quality** — Do all three harnesses (claude, codex, opencode) emit the same metric fields? Any dead fields (always null/same value)? Does `agent.completed` faithfully carry forward `agent.result` metrics?

## Rules

- Read-only. Do not modify source files.
- Only write to `.agents/reports/audit-events.md`.
- Read `.agents/context/previous-audit-events.md` first — skip anything already fixed.
- **Report at most 10 findings.** Prefer fewer, higher-impact items. Cut anything cosmetic or speculative.

## Output

Write `.agents/reports/audit-events.md`. For each finding:

```
### [CRITICAL|IMPROVEMENT|SUGGESTION] Title

**Evidence:** `file:line` — what you found
**Impact:** what breaks or is missing

<details><summary>Fix</summary>

- `file` — change needed

Scope: small / medium / large
</details>
```

Include a harness consistency matrix (which fields each harness emits, flag mismatches).
End with "Top 3 Opportunities" — unimplemented inferences from INFERENCE.md, ordered by impact.
