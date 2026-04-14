---
title: Architecture Audit
description: Code structure and patterns across backend packages
---

Audit code structure and pattern consistency across `packages/core`, `packages/functions`, and `*.remote.ts` files in `apps/console`. Do NOT audit `.svelte` files or frontend UI code.

## What to check

1. **Core domain consistency** — Each domain should export a namespace with `Info` (Zod schema), derived input types, and static methods (`.get()`, `.list()`, `.create()`). Check: which domains follow this, which deviate? Missing input schemas? Inconsistent shared fields? Circular imports?
2. **API route patterns** — Routes should use `validator()` with core schemas (not inline `z.object()`), consistent auth middleware, `VisibleError` for errors, thin handlers that delegate to core. Check: which routes are outliers? Any inline validators that mismatch core types? Business logic that belongs in core?
3. **Remote function patterns** — `query()` for reads, `command()` for mutations, validators reusing core schemas. Check: which remote files are outliers? Any that bypass core and hit the DB directly? Mutations in queries?
4. **Cross-package** — Is the layering correct (core = logic, functions/console = thin wrappers)? Any duplicated implementations? Direct DB imports outside core? Inline validators that mismatch core schemas (flag as critical)?

## Rules

- Read-only. Do not modify source files.
- Only write to `.agents/reports/audit-architecture.md`.
- Read `.agents/context/previous-audit-architecture.md` first — skip anything already fixed.
- **Report at most 10 findings.** Prefer fewer, higher-impact items. Cut anything cosmetic or speculative.

## Output

Write `.agents/reports/audit-architecture.md`. For each finding:

````
### [CRITICAL|IMPROVEMENT|SUGGESTION] Title

**Evidence:** `file:line` — what you found
**Impact:** what breaks or drifts

<details><summary>Fix</summary>

```ts
// code sketch if non-obvious
```

- `file` — change needed

Scope: small / medium / large
</details>
````

Include a domain inventory table (which patterns each domain follows) and a pattern compliance summary.
