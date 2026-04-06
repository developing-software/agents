<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    width?: string;
    children: Snippet;
    onclose?: () => void;
  }

  let {
    open = $bindable(false),
    title,
    width = '400px',
    children,
    onclose,
  }: Props = $props();

  function close() {
    open = false;
    onclose?.();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="overlay" onclick={close}></div>
  <div class="drawer" role="dialog" aria-modal="true" aria-label={title} style="width: {width}; max-width: 100vw;">
    <div class="drawer-header">
      <span class="drawer-title">{title}</span>
      <button type="button" class="close-btn" onclick={close}>&times;</button>
    </div>

    <div class="drawer-body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    max-width: 100vw;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    z-index: 101;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .drawer-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-dim);
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    padding: 2px 4px;
  }
  .close-btn:hover { color: var(--color-text); }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
</style>
