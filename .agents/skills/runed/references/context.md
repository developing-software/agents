# Context

Type-safe wrapper around Svelte's Context API. Eliminates `setContext`/`getContext` boilerplate.

## Define a Context

```ts
// context.ts
import { Context } from "runed";

export const themeCtx = new Context<"light" | "dark">("theme");
```

## Set in Parent

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { themeCtx } from "./context";
  let { data, children } = $props();
  themeCtx.set(data.theme);
</script>

{@render children()}
```

## Get in Child

```svelte
<script lang="ts">
  import { themeCtx } from "./context";

  const theme = themeCtx.get();
  // or with fallback:
  const theme = themeCtx.getOr("light");
</script>
```

## API

| Method            | Description                             |
| ----------------- | --------------------------------------- |
| `set(value)`      | Set context value (initialization only) |
| `get()`           | Get context value (throws if not set)   |
| `getOr(fallback)` | Get context value or fallback           |
| `exists()`        | Check if context was set by parent      |
| `key`             | The unique symbol key                   |

**Note:** Context must be set/get during component initialization — not in event handlers.
