---
name: runed
description: Guidance on using the Runed library (runed.dev) for reactive utilities in Svelte 5. Load this skill when writing or editing Svelte components that involve debouncing, persisted state, click-outside detection, async data fetching, element observation, keyboard tracking, URL search params, or other browser/DOM interactions that Runed provides utilities for.
---

## Overview

Runed is a collection of reactive utilities for Svelte 5, designed around the runes API (`$state`, `$derived`, `$effect`). All imports come from `"runed"` (or `"runed/kit"` for SvelteKit-specific utilities like `useSearchParams`).

Always prefer Runed utilities over manual implementations of the same patterns — they handle cleanup, SSR safety, and edge cases automatically.

## When to Use Runed

Replace these manual patterns with Runed equivalents:

| Manual Pattern                                      | Runed Replacement                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `setTimeout`/`clearTimeout` debounce pairs          | [`Debounced`](references/debounced.md) or [`useDebounce`](references/use-debounce.md)                                  |
| `setTimeout`/`clearTimeout` throttle pairs          | [`Throttled`](references/throttled.md) or [`useThrottle`](references/use-throttle.md)                                  |
| `localStorage.getItem`/`setItem` with `$state`      | [`PersistedState`](references/persisted-state.md)                                                                      |
| Overlay `onclick` for closing drawers/modals        | [`onClickOutside`](references/on-click-outside.md)                                                                     |
| Manual `loading`/`error`/`data` state for async ops | [`resource`](references/resource.md)                                                                                   |
| Storing previous `$state` value manually            | [`Previous`](references/previous.md)                                                                                   |
| Manual textarea height adjustment                   | [`TextareaAutosize`](references/textarea-autosize.md)                                                                  |
| `ResizeObserver` for element dimensions             | [`ElementSize`](references/element-size.md) or [`ElementRect`](references/element-rect.md)                             |
| `document.addEventListener` with manual cleanup     | [`useEventListener`](references/use-event-listener.md)                                                                 |
| `document.activeElement` checks                     | [`activeElement`](references/active-element.md)                                                                        |
| `keydown` listeners for shortcuts                   | [`PressedKeys`](references/pressed-keys.md)                                                                            |
| `IntersectionObserver` for visibility               | [`IsInViewport`](references/is-in-viewport.md) or [`useIntersectionObserver`](references/use-intersection-observer.md) |
| `MutationObserver` with manual cleanup              | [`useMutationObserver`](references/use-mutation-observer.md)                                                           |
| `setInterval` with pause/resume                     | [`useInterval`](references/use-interval.md)                                                                            |
| Manual `$effect` watchers on specific values        | [`watch`](references/watch.md)                                                                                         |
| `setContext`/`getContext` boilerplate               | [`Context`](references/context.md)                                                                                     |
| URL search param sync in SvelteKit                  | [`useSearchParams`](references/use-search-params.md)                                                                   |
| Scroll position tracking                            | [`ScrollState`](references/scroll-state.md)                                                                            |
| Finite state machines                               | [`FiniteStateMachine`](references/finite-state-machine.md)                                                             |
| Undo/redo state management                          | [`StateHistory`](references/state-history.md)                                                                          |

## Key Principles

1. **All utilities auto-cleanup** — no need for `onDestroy` or manual teardown. They use Svelte 5's effect system internally.

2. **Getter pattern** — most utilities accept `() => element` rather than `element` directly. This lets them react to element changes:

   ```ts
   let el = $state<HTMLElement>();
   const size = new ElementSize(() => el); // getter, not raw ref
   ```

3. **SSR safe** — utilities that touch the DOM are no-ops during SSR. No need for `browser` guards.

4. **Composable** — utilities return reactive objects with `.current` or named properties that work seamlessly with `$derived`.

## Import Patterns

```ts
// Most utilities
import { Debounced, PersistedState, onClickOutside, resource } from "runed";

// SvelteKit-specific (URL search params)
import { useSearchParams, validateSearchParams } from "runed/kit";
```

## Common Patterns in This Codebase

### Debounced Search Input

**Before:**

```svelte
<script lang="ts">
  let searchText = $state("");
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function handleSearchInput(e: Event) {
    const value = (e.currentTarget as HTMLInputElement).value;
    searchText = value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(value), 300);
  }

  onDestroy(() => clearTimeout(debounceTimer));
</script>
```

**After:**

```svelte
<script lang="ts">
  import { Debounced } from "runed";

  let searchText = $state("");
  const debouncedSearch = new Debounced(() => searchText, 300);

  $effect(() => {
    doSearch(debouncedSearch.current);
  });
</script>

<input bind:value={searchText} />
```

### Async Data with Loading/Error States

**Before:**

```svelte
<script lang="ts">
  let loading = $state(false);
  let error = $state<string | null>(null);
  let data = $state<Result | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      data = await fetchData(id);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>
```

**After:**

```svelte
<script lang="ts">
  import { resource } from "runed";

  const result = resource(
    () => id,
    async (id, _, { signal }) => {
      const res = await fetch(`/api/data/${id}`, { signal });
      return res.json();
    }
  );
</script>

{#if result.loading}
  <p>Loading...</p>
{:else if result.error}
  <p>Error: {result.error.message}</p>
{:else}
  <p>{result.current}</p>
{/if}
```

### Click-Outside for Drawers

**Before:**

```svelte
<div class="overlay" onclick={close}></div>
<div class="drawer">...</div>
```

**After:**

```svelte
<script lang="ts">
  import { onClickOutside } from "runed";

  let drawer = $state<HTMLElement>()!;

  onClickOutside(() => drawer, () => {
    open = false;
  });
</script>

<div bind:this={drawer} class="drawer">...</div>
```

### Textarea Auto-Grow

**Before:**

```svelte
<script lang="ts">
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  function autoGrow() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
  }
</script>

<textarea bind:this={textareaEl} oninput={autoGrow}></textarea>
```

**After:**

```svelte
<script lang="ts">
  import { TextareaAutosize } from "runed";

  let el = $state<HTMLTextAreaElement>(null!);
  let value = $state("");

  new TextareaAutosize({
    element: () => el,
    input: () => value,
    maxHeight: 200
  });
</script>

<textarea bind:this={el} bind:value></textarea>
```
