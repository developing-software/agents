# Previous

Tracks the previous value of a reactive getter. Useful for comparing state changes or transition effects.

## Usage

```svelte
<script lang="ts">
  import { Previous } from "runed";

  let count = $state(0);
  const previous = new Previous(() => count);
</script>

<button onclick={() => count++}>Count: {count}</button>
<p>Previous: {previous.current ?? "none"}</p>
```

## API

```ts
const prev = new Previous(getter: () => T);
```

| Property  | Description                                |
| --------- | ------------------------------------------ |
| `current` | The previous value (`undefined` initially) |
