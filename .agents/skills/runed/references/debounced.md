# Debounced

A wrapper over `useDebounce` that provides a debounced reactive state. The value updates only after the specified duration of inactivity.

## Usage

```svelte
<script lang="ts">
  import { Debounced } from "runed";

  let search = $state("");
  const debounced = new Debounced(() => search, 500);
</script>

<input bind:value={search} />
<p>Debounced: {debounced.current}</p>
```

## API

```ts
const debounced = new Debounced(getter: () => T, durationMs: number);
```

| Property/Method         | Description                           |
| ----------------------- | ------------------------------------- |
| `current`               | The current debounced value           |
| `cancel()`              | Cancel any pending debounced update   |
| `setImmediately(value)` | Set value immediately, cancel pending |
| `updateImmediately()`   | Execute pending update immediately    |

## Example: Cancel and Immediate

```ts
let count = $state(0);
const debounced = new Debounced(() => count, 500);

count = 1;
debounced.cancel(); // Still 0

count = 2;
debounced.setImmediately(count); // Now 2

count = 3;
await debounced.updateImmediately(); // Now 3
```
