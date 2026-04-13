<script lang="ts">
  let {
    tabs,
    activePath,
    handleSelect,
  }: {
    tabs: Array<{ path: string; dirty: boolean }>;
    activePath: string;
    handleSelect?: (path: string) => void;
  } = $props();
</script>

<div class="tabs" role="tablist" aria-label="AGENTS files">
  {#if tabs.length === 0}
    <div class="empty">No AGENTS.md files detected</div>
  {:else}
    {#each tabs as tab (tab.path)}
      <button
        type="button"
        class="tab"
        class:tab-active={tab.path === activePath}
        role="tab"
        aria-selected={tab.path === activePath}
        onclick={() => handleSelect?.(tab.path)}
        title={tab.path}
      >
        <span class="tab-label">{tab.path}</span>
        {#if tab.dirty}
          <span class="dirty-dot" aria-label="Unsaved changes"></span>
        {/if}
      </button>
    {/each}
  {/if}
</div>

<style>
  .tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    padding: 4px;
    border-radius: 6px;
  }

  .empty {
    font-size: 12px;
    color: var(--color-dim);
    padding: 6px 8px;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 260px;
    border: 1px solid transparent;
    border-radius: 5px;
    padding: 5px 8px;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.12s;
  }

  .tab:hover {
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }

  .tab-active {
    color: var(--color-text);
    background: var(--color-surface);
    border-color: var(--color-border);
  }

  .tab-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-warning);
    flex-shrink: 0;
  }
</style>
