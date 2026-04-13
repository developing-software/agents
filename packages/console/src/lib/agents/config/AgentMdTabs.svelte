<script lang="ts">
  import type { EditorTab } from './config-types';

  let {
    tabs,
    activeIndex = $bindable(),
  }: {
    tabs: EditorTab[];
    activeIndex: number;
  } = $props();

  function isDirty(tab: EditorTab): boolean {
    return tab.currentContent !== tab.originalContent;
  }
</script>

{#if tabs.length > 0}
  <div class="tab-bar">
    {#each tabs as tab, i (tab.path)}
      <button
        type="button"
        class="tab"
        class:tab-active={i === activeIndex}
        onclick={() => { activeIndex = i; }}
        title={tab.path}
      >
        <span class="tab-name">{tab.path.split('/').pop()}</span>
        {#if isDirty(tab)}
          <span class="tab-dirty"></span>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .tab-bar {
    display: flex;
    gap: 1px;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    padding: 0 4px;
    overflow-x: auto;
    flex-shrink: 0;
  }

  .tab-bar::-webkit-scrollbar { height: 0; }

  .tab {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 6px 12px;
    border: none;
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    transition: color 0.1s, border-color 0.1s;
    position: relative;
  }
  .tab:hover { color: var(--color-muted); }
  .tab-active {
    color: var(--color-text);
    border-bottom-color: var(--color-accent);
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }

  .tab-dirty {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-warning);
    flex-shrink: 0;
  }
</style>
