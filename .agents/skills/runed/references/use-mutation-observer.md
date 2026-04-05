# useMutationObserver

Observe DOM mutations on an element — attribute changes, child list modifications, etc.

## Usage

```svelte
<script lang="ts">
  import { useMutationObserver } from "runed";

  let el = $state<HTMLElement | null>(null);

  useMutationObserver(
    () => el,
    (mutations) => {
      for (const mutation of mutations) {
        console.log("Changed:", mutation.attributeName);
      }
    },
    { attributes: true }
  );
</script>

<div bind:this={el}>...</div>
```

## API

```ts
const observer = useMutationObserver(
  elementGetter: () => HTMLElement | null,
  callback: (mutations: MutationRecord[]) => void,
  options: MutationObserverInit
);

observer.stop(); // halt observation
```
