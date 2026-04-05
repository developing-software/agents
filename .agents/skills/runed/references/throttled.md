# Throttled

A wrapper over `useThrottle` that returns a throttled reactive state. The value updates at most once per specified interval.

## Usage

```svelte
<script lang="ts">
  import { Throttled } from "runed";

  let search = $state("");
  const throttled = new Throttled(() => search, 500);
</script>

<input bind:value={search} />
<p>Throttled: {throttled.current}</p>
```

## API

```ts
const throttled = new Throttled(getter: () => T, durationMs: number);
```

| Property/Method         | Description                           |
| ----------------------- | ------------------------------------- |
| `current`               | The current throttled value           |
| `cancel()`              | Cancel any pending throttled update   |
| `setImmediately(value)` | Set value immediately, cancel pending |
