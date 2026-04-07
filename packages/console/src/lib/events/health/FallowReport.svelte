<script lang="ts">
  import FallowHealth from './FallowHealth.svelte';
  import FallowDeadCode from './FallowDeadCode.svelte';
  import FallowDupes from './FallowDupes.svelte';

  interface Props {
    data: any;
  }

  let { data }: Props = $props();

  const reportType = $derived.by(() => {
    if (!data || typeof data !== 'object') return 'unknown';
    if ('vital_signs' in data) return 'health';
    if ('unused_files' in data || 'unused_exports' in data) return 'dead-code';
    if ('clone_groups' in data) return 'dupes';
    return 'unknown';
  });

  const topLevelEntries = $derived.by(() => {
    if (reportType !== 'unknown' || !data || typeof data !== 'object') return [];
    return Object.entries(data).map(([key, val]) => ({
      key,
      value: typeof val === 'object' ? JSON.stringify(val) : String(val),
    }));
  });
</script>

{#if reportType === 'health'}
  <FallowHealth {data} />
{:else if reportType === 'dead-code'}
  <FallowDeadCode {data} />
{:else if reportType === 'dupes'}
  <FallowDupes {data} />
{:else}
  <div class="fallback">
    {#if topLevelEntries.length > 0}
      <div class="kv-list">
        {#each topLevelEntries as entry (entry.key)}
          <div class="kv-row">
            <span class="kv-key">{entry.key}</span>
            <span class="kv-val">{entry.value}</span>
          </div>
        {/each}
      </div>
    {:else}
      <span class="empty">No data</span>
    {/if}
  </div>
{/if}

<style>
  .fallback {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
  }

  .kv-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .kv-row {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }

  .kv-key {
    font-size: 11px;
    color: var(--color-dim);
    min-width: 140px;
  }

  .kv-val {
    font-size: 11px;
    color: var(--color-text);
  }

  .empty {
    font-size: 11px;
    color: var(--color-dim);
  }
</style>
