<script lang="ts">
  import { onClickOutside } from 'runed';
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  interface Props {
    open: boolean;
    title: string;
    width?: string;
    children: Snippet;
    canclose?: () => boolean;
    onclose?: () => void;
  }

  let {
    open = $bindable(false),
    title,
    width = '400px',
    children,
    canclose,
    onclose,
  }: Props = $props();

  let drawer = $state<HTMLElement>();

  function close() {
    if (canclose?.() === false) return;
    open = false;
    onclose?.();
  }

  onClickOutside(() => drawer, close);
</script>

{#if open}
  <div class="overlay" transition:fade></div>
  <div bind:this={drawer} transition:fly={{ x: 1000 }} class="drawer" role="dialog" aria-modal="true" aria-label={title} style="width: {width}; max-width: 100vw;">
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
    backdrop-filter: blur(4px);
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
