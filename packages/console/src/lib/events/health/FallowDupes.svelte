<script lang="ts">
  interface Props {
    data: any;
  }

  let { data }: Props = $props();

  const metrics = $derived.by(() => {
    const s = data.stats ?? {};
    return [
      { label: 'Clone groups', value: s.clone_groups ?? '—' },
      { label: 'Clone instances', value: s.clone_instances ?? '—' },
      { label: 'Duplication', value: s.duplication_percentage != null ? `${Number(s.duplication_percentage).toFixed(1)}%` : '—' },
      { label: 'Duplicated lines', value: s.duplicated_lines ?? '—' },
      { label: 'Duplicated tokens', value: s.duplicated_tokens ?? '—' },
    ];
  });

  const cloneGroups = $derived.by(() => {
    if (!Array.isArray(data.clone_groups)) return [];
    return data.clone_groups.slice(0, 10);
  });

  let expandedGroups = $state<Record<number, boolean>>({});

  function toggleGroup(idx: number) {
    expandedGroups[idx] = !expandedGroups[idx];
  }
</script>

<div class="report">
  <div class="metrics-row">
    {#each metrics as metric (metric.label)}
      <div class="metric">
        <span class="metric-label">{metric.label}</span>
        <span class="metric-value">{metric.value}</span>
      </div>
    {/each}
  </div>

  {#if cloneGroups.length > 0}
    <div class="section-header">
      Clone groups
      {#if Array.isArray(data.clone_groups) && data.clone_groups.length > 10}
        <span class="section-note">(showing 10 of {data.clone_groups.length})</span>
      {/if}
    </div>
    <div class="items">
      {#each cloneGroups as group, i (i)}
        <div class="item-card">
          <div class="item-main">
            <div class="badges">
              {#if group.token_count != null}
                <span class="badge">{group.token_count} tokens</span>
              {/if}
              {#if group.line_count != null}
                <span class="badge">{group.line_count} lines</span>
              {/if}
            </div>
          </div>
          {#if Array.isArray(group.instances)}
            <div class="instance-list">
              {#each group.instances as inst, j (inst.path ? `${inst.path}:${inst.start_line}` : j)}
                <span class="filepath">
                  {inst.path ?? '—'}{#if inst.start_line != null && inst.end_line != null}:{inst.start_line}-{inst.end_line}{/if}
                </span>
              {/each}
            </div>
          {/if}
          {#if group.instances?.[0]?.fragment}
            <button type="button" class="toggle-btn" onclick={() => toggleGroup(i)}>
              {expandedGroups[i] ? 'Hide' : 'Show'} fragment
            </button>
            {#if expandedGroups[i]}
              <pre class="fragment">{group.instances[0].fragment}</pre>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .report {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
  }
  .metrics-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 8px;
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .metric-label {
    font-size: 10px;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .metric-value {
    font-size: 11px;
    color: var(--color-text);
  }
  .section-header {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-muted);
    margin-top: 12px;
    margin-bottom: 6px;
  }
  .section-note {
    font-size: 10px;
    text-transform: none;
    letter-spacing: 0;
    color: var(--color-dim);
  }
  .filepath {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    word-break: break-all;
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .item-card {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 6px;
    background: var(--color-elevated);
  }
  .item-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .badges {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    white-space: nowrap;
    line-height: 1.6;
  }
  .instance-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: 4px;
  }
  .toggle-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    margin-top: 4px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-dim);
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
  }
  .toggle-btn:hover {
    color: var(--color-muted);
  }
  .fragment {
    margin: 4px 0 0;
    padding: 6px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-text);
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
  }
</style>
