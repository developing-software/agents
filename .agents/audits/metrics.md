---
title: Metrics Audit
description: Tag system, metric pipeline, and console dashboard consistency
---

You are running a metrics audit of this repository.

Your job: find inconsistencies, gaps, and improvement opportunities across the tag system, metric collection pipeline, and console dashboards -- then produce an actionable report with implementation plans for each finding.

## Previous Audit

Read `.agents/context/previous-audit-metrics.md` first. This contains the previous audit report.
Track what was fixed since then, what is still open, and what is new.

## Constraints

- Do NOT create GitHub issues or PRs -- the workflow handles that.
- Do NOT modify any source files -- this is a read-only audit.
- Do NOT use shell commands beyond `ls`, `find`, and `wc`.
- Only write to `.agents/reports/audit-metrics.md`.
- Fill every section with real findings. No placeholders or template text.

## Audit Areas

Use subagents (Agent tool) to research these areas in parallel (one subagent per area). Each subagent explores its area, discovers the relevant files itself, and returns structured findings. Then you compile the final report.

### Area 1: Tag System Consistency

The codebase has a tag system spanning type definitions (core), tag production (agent actions, webhooks), and tag display (console styling, extraction, filtering).

**Questions to answer:**
- Are all tags produced in application code also defined in the core Tag type union?
- Do all tag prefixes have console styling and extractor functions?
- Are there builder keys in the Tags object that don't correspond to any produced tag?
- Are there tag prefixes used in code but missing from known-prefix lists?

**Where to look:** Tag type definitions in `packages/core`, tag construction in `actions/agent/workflow/src/`, webhook handlers in `packages/core/src/github/`, tag styling/extraction in `packages/console/src/lib/tag/`.

### Area 2: Metric Pipeline Integrity

Agent harnesses (claude, codex, opencode) emit metrics via events. These flow through type definitions, query functions, and into console display components.

**Questions to answer:**
- Do all harnesses emit the same set of metric fields, or are some missing/null for certain harnesses?
- Are emitted metrics fully represented in the EventMetrics type and METRIC_KEYS arrays?
- Do query functions (`getEventSummary`, `getAgentComparison`, `listAgentRuns`) use consistent event types as their source?
- Are there metric fields emitted but never queried or displayed?

**Where to look:** Harness action files under `actions/agent/*/`, event metric types and helpers in `packages/console/src/lib/events/`, the agent workflow finish script that composes the `agent.completed` payload.

### Area 3: Console Data Coverage

The console displays agent run data across several pages and components. Some collected data may not be surfaced anywhere.

**Questions to answer:**
- What fields are in the `agent.completed` event payload but not shown in any console UI?
- What dashboard views are missing (time-series trends, per-model breakdowns, filtering)?
- Are there defined OriginType values that no code ever uses?
- What TODO/FIXME/HACK comments exist in the files you examine?

**Where to look:** Console route pages under `packages/console/src/routes/gh/[organization]/[repo]/`, event overview and agent overview components in `packages/console/src/lib/events/`, event type definitions in `packages/core/src/events/`.

### Area 4: Improvement Opportunities

Based on findings from all other areas, identify new metrics, views, or features derivable from existing data. Prioritize by impact and implementation effort. Focus especially on metrics that can be inferred from existing event data without requiring new instrumentation.

## Finding Format

Every finding MUST include all of these fields:

```
### [SEVERITY] Title

**Evidence:** `file/path.ts:LINE` — description of what you found
**Root cause:** Why this gap/inconsistency exists
**Impact:** What breaks, misleads, or is missing because of this

<details>
<summary>Implementation plan</summary>

**Files to change:**
- `path/to/file.ts` — what to change

**Steps:**
1. Step with code sketch if applicable
2. ...

**Scope:** small / medium / large
</details>
```

Severity levels:
- **CRITICAL** — type mismatch, data loss, or misleading display
- **IMPROVEMENT** — functional gap, missing data surface, inconsistency
- **SUGGESTION** — nice-to-have enhancement

## Report Structure

Write `.agents/reports/audit-metrics.md` using **GitHub Flavored Markdown (GFM)** -- the report will be rendered as a GitHub issue body.

Use GFM features for readability:
- `- [ ]` / `- [x]` task list checkboxes for trackable findings
- `<details><summary>...</summary>...</details>` for collapsible implementation plans
- Tables with `| col | col |` syntax for structured data
- Fenced code blocks with language tags (` ```ts `) for code snippets
- `**bold**` for severity labels and key terms

```markdown
# Metrics Audit — YYYY-MM-DD

## Summary

| Severity | Count |
|---|---|
| Critical | N |
| Improvement | N |
| Suggestion | N |

**Delta from previous audit:** N fixed, N still open, N new

## Fixed Since Last Audit
- [x] Description of what was fixed (was: previous finding title)

## Open Findings

### Tag System
- [ ] Finding title — one-line summary
(full finding with implementation plan below)

### Metric Pipeline
- [ ] ...

### Console Coverage
- [ ] ...

## New Opportunities
Ordered by impact. Each with implementation plan.
Focus on metrics inferable from existing event data.

## Checklist
All findings as a flat `- [ ]` list for tracking.
```
