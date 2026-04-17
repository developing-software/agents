<script lang="ts">
  import { useInterval } from 'runed';
  import type { Snippet } from 'svelte';
  import { relativeTime } from '../helpers';

  interface Props {
    title: string;
    cachedAt: string | null;
    loading: boolean;
    onrefresh: () => void;
    children: Snippet;
  }

  let {
    title,
    cachedAt,
    loading,
    onrefresh,
    children,
  }: Props = $props();

  const clock = useInterval(1000);

  const updatedLabel = $derived.by(() => {
    clock.counter;
    return cachedAt ? relativeTime(cachedAt) : null;
  });
</script>

<section class="section">
  <div class="header" class:loading>
    <h3 class="heading">{title}</h3>

    <div class="meta">
      {#if updatedLabel}
        <span class="updated">Updated {updatedLabel}</span>
      {/if}
      <button
        type="button"
        class="refresh-btn"
        onclick={onrefresh}
        disabled={loading}
        aria-label="Refresh {title}"
      >
        <svg
          class="refresh-icon"
          class:spinning={loading}
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.65 2.35A7.96 7.96 0 0 0 8 0a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24L9 7h7V0l-2.35 2.35Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  </div>

  <div class="body">
    {@render children()}
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    transition: opacity 0.2s ease;
  }

  .header.loading {
    animation: pulse 1.4s ease-in-out infinite;
  }

  .heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .header::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .updated {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    white-space: nowrap;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-surface);
    color: var(--color-dim);
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s;
  }

  .refresh-btn:hover:not(:disabled) {
    color: var(--color-text);
    border-color: var(--color-muted);
  }

  .refresh-btn:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .refresh-icon {
    flex-shrink: 0;
  }

  .refresh-icon.spinning {
    animation: spin 0.8s linear infinite;
  }

  .body {
    display: flex;
    flex-direction: column;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
