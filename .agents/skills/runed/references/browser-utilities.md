# Browser Utilities

Small, focused utilities for common browser state tracking.

## IsDocumentVisible

Track document/tab visibility via Page Visibility API:

```svelte
<script lang="ts">
  import { IsDocumentVisible } from "runed";
  const visible = new IsDocumentVisible();
</script>

<p>Tab visible: {visible.current}</p>
```

## IsIdle

Track user activity with configurable timeout:

```svelte
<script lang="ts">
  import { IsIdle } from "runed";
  const idle = new IsIdle({ timeout: 60000 });
</script>

<p>Idle: {idle.current}</p>
<p>Last active: {new Date(idle.lastActive).toLocaleTimeString()}</p>
```

Options: `events` (default: mousemove, mousedown, resize, keydown, touchstart, wheel), `timeout` (default: 60000ms), `detectVisibilityChanges`, `initialState`.

## IsMounted

Track component mount state:

```svelte
<script lang="ts">
  import { IsMounted } from "runed";
  const mounted = new IsMounted();
</script>

{#if mounted.current}
  <p>Component is mounted</p>
{/if}
```

## IsFocusWithin

Track if any descendant has focus:

```svelte
<script lang="ts">
  import { IsFocusWithin } from "runed";

  let form = $state<HTMLFormElement>();
  const focusWithin = new IsFocusWithin(() => form);
</script>

<form bind:this={form} class:focused={focusWithin.current}>
  <input type="text" />
</form>
```

## boolAttr

Convert any value to `""` or `undefined` for proper HTML boolean attributes:

```svelte
<script lang="ts">
  import { boolAttr } from "runed";
  let active = $state(true);
</script>

<!-- Renders as: <div data-active> not <div data-active="true"> -->
<div data-active={boolAttr(active)}>...</div>
```

## onCleanup

Register a cleanup function (shorthand for `$effect` return):

```svelte
<script lang="ts">
  import { onCleanup } from "runed";
  onCleanup(() => console.log("Component destroyed"));
</script>
```

## AnimationFrames

`requestAnimationFrame` wrapper with FPS control:

```ts
import { AnimationFrames } from "runed";

const anim = new AnimationFrames(
  ({ delta }) => {
    /* per-frame logic */
  },
  { fpsLimit: () => 60 },
);

anim.fps; // current FPS
anim.running; // boolean
```
