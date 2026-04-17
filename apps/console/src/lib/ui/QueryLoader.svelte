<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The query object (or null for conditional loads). */
    query: { current: T | undefined; loading: boolean; error: unknown; refresh: () => void } | null;
    /** Rendered when data is available. Receives the unwrapped value. */
    children: Snippet<[T]>;
    /** Rendered during first load (no stale data yet). Falls back to a generic pulse skeleton. */
    loading?: Snippet;
    /** Rendered on error. Falls back to a message + retry button. */
    error?: Snippet<[{ error: unknown; retry: () => void }]>;
    /** Rendered when query resolves to empty (null/undefined/[]). Optional -- if omitted, children receives the value as-is. */
    empty?: Snippet;
  }

  let { query, children, loading, error, empty }: Props = $props();

  function isEmpty(value: unknown): boolean {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }
</script>

{#if query === null}
  <!-- conditional load not yet triggered -->
{:else if query.loading && !query.current}
  {#if loading}
    {@render loading()}
  {:else}
    <div class="qloader-skeleton">
      {#each [1, 2, 3] as i (i)}
        <div class="qloader-skeleton-row">
          <div class="qloader-skeleton-block" style="width:5px;height:5px;border-radius:50%;"></div>
          <div class="qloader-skeleton-block" style="width:140px;height:12px;"></div>
          <div class="qloader-skeleton-block" style="width:48px;height:16px;"></div>
          <div class="qloader-skeleton-block" style="width:40px;height:11px;margin-left:auto;"></div>
        </div>
      {/each}
    </div>
  {/if}
{:else if query.error && !query.current}
  {#if error}
    {@render error({ error: query.error, retry: () => query!.refresh() })}
  {:else}
    <div class="qloader-error">
      <span class="qloader-error-text">Failed to load</span>
      <button type="button" class="qloader-retry" onclick={() => query!.refresh()}>Retry</button>
    </div>
  {/if}
{:else if empty && isEmpty(query.current)}
  {@render empty()}
{:else if query.current !== undefined}
  {#if query.loading}
    <div class="qloader-refreshing">
      {@render children(query.current)}
    </div>
  {:else}
    {@render children(query.current)}
  {/if}
{/if}

<style>
  .qloader-skeleton {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: 4px;
  }

  .qloader-skeleton-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }

  .qloader-skeleton-block {
    background: var(--color-elevated);
    border-radius: 3px;
    animation: qloader-pulse 1.4s ease-in-out infinite;
  }

  @keyframes qloader-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .qloader-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent);
    border-radius: 3px;
    margin-top: 4px;
  }

  .qloader-error-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-danger);
    flex: 1;
  }

  .qloader-retry {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    background: none;
    color: var(--color-danger);
    cursor: pointer;
  }

  .qloader-refreshing {
    opacity: 0.7;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }
</style>
