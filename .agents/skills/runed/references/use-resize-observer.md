# useResizeObserver

Detect changes in the size of an element via ResizeObserver. For simple width/height tracking, prefer `ElementSize`.

## Usage

```svelte
<script lang="ts">
  import { useResizeObserver } from "runed";

  let el = $state<HTMLElement | null>(null);
  let text = $state("");

  useResizeObserver(
    () => el,
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      text = `${width} x ${height}`;
    }
  );
</script>

<textarea bind:this={el} readonly value={text}></textarea>
```

## API

```ts
const observer = useResizeObserver(
  elementGetter: () => HTMLElement | null,
  callback: (entries: ResizeObserverEntry[]) => void
);

observer.stop(); // terminate observation
```
