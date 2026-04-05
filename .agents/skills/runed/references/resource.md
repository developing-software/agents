# resource

Watch for changes and run async data fetching. Provides automatic request cancellation, loading/error states, and debounce/throttle options.

## Basic Usage

```svelte
<script lang="ts">
  import { resource } from "runed";

  let id = $state(1);

  const post = resource(
    () => id,
    async (id, prevId, { signal }) => {
      const res = await fetch(`/api/posts/${id}`, { signal });
      return res.json();
    }
  );
</script>

{#if post.loading}
  <p>Loading...</p>
{:else if post.error}
  <p>Error: {post.error.message}</p>
{:else}
  <p>{post.current?.title}</p>
{/if}
```

## Multiple Dependencies

```ts
const results = resource([() => query, () => page], async ([query, page], _, { signal }) => {
  const res = await fetch(`/api/search?q=${query}&page=${page}`, { signal });
  return res.json();
});
```

## With Debounce

```ts
const results = resource(
  () => searchText,
  async (query, _, { signal }) => {
    const res = await fetch(`/api/search?q=${query}`, { signal });
    return res.json();
  },
  { debounce: 300 },
);
```

## Options

| Option         | Description                      |
| -------------- | -------------------------------- |
| `lazy`         | Skip initial fetch               |
| `once`         | Only fetch once                  |
| `initialValue` | Initial value before first fetch |
| `debounce`     | Milliseconds to debounce         |
| `throttle`     | Milliseconds to throttle         |

## API

| Property/Method  | Description                            |
| ---------------- | -------------------------------------- |
| `current`        | Current fetched value (or `undefined`) |
| `loading`        | `true` while fetching                  |
| `error`          | Error object if failed                 |
| `mutate(value)`  | Directly update the value              |
| `refetch(info?)` | Re-run the fetcher                     |

## Pre-render Variant

Use `resource.pre()` to run the fetcher before rendering (uses `$effect.pre` internally):

```ts
const data = resource.pre(
  () => query,
  async (query, _, { signal }) => {
    /* ... */
  },
);
```

## Custom Cleanup

```ts
const stream = resource(
  () => streamId,
  async (id, _, { signal, onCleanup }) => {
    const es = new EventSource(`/api/stream/${id}`);
    onCleanup(() => es.close());
    const res = await fetch(`/api/stream/${id}/init`, { signal });
    return res.json();
  },
);
```

## Notes

- Requests are automatically cancelled when dependencies change
- Use either `debounce` or `throttle`, not both
- The `signal` is an `AbortSignal` — pass it to `fetch` for automatic cancellation
