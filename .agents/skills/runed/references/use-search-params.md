# useSearchParams

Reactive, schema-validated URL search params for SvelteKit. Import from `"runed/kit"`.

**Requires:** `@sveltejs/kit` installed. Uses Standard Schema for validation (Zod, Valibot, Arktype, or built-in schema).

## With Built-in Schema

```ts
import { createSearchParamsSchema, useSearchParams } from "runed/kit";

const schema = createSearchParamsSchema({
  page: { type: "number", default: 1 },
  filter: { type: "string", default: "" },
  sort: { type: "string", default: "newest" },
  tags: { type: "array", default: ["new"], arrayType: "" },
});

const params = useSearchParams(schema);
params.page = 2; // Updates URL to ?page=2
params.update({ page: 3, sort: "oldest" }); // Batch update
params.reset(); // Reset to defaults
```

## With Zod

```ts
import { z } from "zod";
import { useSearchParams } from "runed/kit";

const schema = z.object({
  page: z.coerce.number().default(1),
  filter: z.string().default(""),
  sort: z.enum(["newest", "oldest", "price"]).default("newest"),
});

const params = useSearchParams(schema);
```

## Server-Side Validation

```ts
// +page.server.ts
import { validateSearchParams } from "runed/kit";

export const load = ({ url }) => {
  const { searchParams, data } = validateSearchParams(url, schema);
  // data is typed and validated
};
```

## Binding to Inputs

```svelte
<input type="text" bind:value={params.filter} />
```

## Options

| Option         | Default | Description                |
| -------------- | ------- | -------------------------- |
| `showDefaults` | `false` | Show defaults in URL       |
| `debounce`     | `0`     | Delay URL updates (ms)     |
| `pushHistory`  | `true`  | Create history entries     |
| `compress`     | `false` | Compress into single param |
| `updateURL`    | `true`  | Update URL on changes      |
| `noScroll`     | `false` | Preserve scroll position   |

## Schema Types

`string`, `number`, `boolean`, `array`, `object`, `date` (with `dateFormat: "date" | "datetime"`)

## Reactivity Limitation

Direct property assignment works (`params.page = 2`). Nested mutation does NOT (`params.config.theme = "dark"` — reassign the whole object instead).
