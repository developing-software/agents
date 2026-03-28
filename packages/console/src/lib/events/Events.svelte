<script lang="ts">
  import EventList from './EventList.svelte';
  import EventTree from './EventTree.svelte';

  let {
    organization,
    repoName,
    filterTags = [],
    compact = false,
    emptyText = 'No events',
  }: {
    organization: string;
    repoName: string;
    filterTags?: string[];
    compact?: boolean;
    emptyText?: string;
  } = $props();

  let view = $state<'list' | 'tree'>('list');
</script>

<div class="header">
  <div class="tabs">
    <button type="button" class="tab" class:tab-active={view === 'list'} onclick={() => { view = 'list'; }}>List</button>
    <button type="button" class="tab" class:tab-active={view === 'tree'} onclick={() => { view = 'tree'; }}>Tree</button>
  </div>

  {#if filterTags.length > 0}
    <div class="tags">
      {#each filterTags as tag (tag)}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  {/if}
</div>

{#if view === 'list'}
  <EventList {organization} {repoName} {filterTags} {compact} {emptyText} />
{:else}
  <EventTree {organization} {repoName} {filterTags} {emptyText} />
{/if}

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .tabs {
    display: flex;
    gap: 2px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px;
  }

  .tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 10px;
    border-radius: 3px;
    border: none;
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    line-height: 1.6;
    transition: color 0.1s, background 0.1s;
  }
  .tab:hover { color: var(--color-muted); }
  .tab-active { background: var(--color-surface); color: var(--color-text); }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-dim);
    line-height: 1.6;
  }
</style>
