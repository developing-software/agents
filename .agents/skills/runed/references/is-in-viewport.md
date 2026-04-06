# IsInViewport

Track if an element is visible within the viewport using IntersectionObserver.

## Usage

```svelte
<script lang="ts">
  import { IsInViewport } from "runed";

  let el = $state<HTMLElement>()!;
  const inViewport = new IsInViewport(() => el);
</script>

<div bind:this={el}>Target</div>
<p>Visible: {inViewport.current}</p>
```

## One-Time Detection

Observe once then stop — useful for fade-in animations:

```ts
const inViewport = new IsInViewport(() => el, { once: true });
```

## Observer Controls

```ts
inViewport.observer.pause();
inViewport.observer.resume();
inViewport.observer.stop();
console.log(inViewport.observer.isActive);
```

## API

| Property   | Description                                               |
| ---------- | --------------------------------------------------------- |
| `current`  | `true` if element is in viewport                          |
| `observer` | Observer controls (`pause`, `resume`, `stop`, `isActive`) |
