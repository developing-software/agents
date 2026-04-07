<script lang="ts">
  import { cloneGroupPrompt, dupesSelectionPrompt } from './prompt';

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
  let selected = $state<Set<number>>(new Set());
  let copiedItem = $state<number | null>(null);
  let copiedBar = $state<string | null>(null);

  function toggleGroup(idx: number) {
    expandedGroups[idx] = !expandedGroups[idx];
  }

  function toggleSelect(idx: number) {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    selected = next;
  }

  async function copyItem(group: any, idx: number) {
    await navigator.clipboard.writeText(cloneGroupPrompt(group));
    copiedItem = idx;
    setTimeout(() => { copiedItem = null; }, 1200);
  }

  async function copySelection(style: 'fix' | 'plan') {
    const groups = cloneGroups.filter((_: any, i: number) => selected.has(i));
    if (!groups.length) return;
    await navigator.clipboard.writeText(dupesSelectionPrompt(groups, style));
    copiedBar = style;
    setTimeout(() => { copiedBar = null; }, 1200);
  }

  function clearSelection() {
    selected = new Set();
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

    {#if selected.size > 0}
      <div class="selection-bar">
        <span class="selection-count">{selected.size} selected</span>
        <button type="button" class="bar-btn" onclick={() => copySelection('fix')}>
          {copiedBar === 'fix' ? 'Copied' : 'Copy fix'}
        </button>
        <button type="button" class="bar-btn" onclick={() => copySelection('plan')}>
          {copiedBar === 'plan' ? 'Copied' : 'Copy plan'}
        </button>
        <button type="button" class="bar-btn dim" onclick={clearSelection}>Clear</button>
      </div>
    {/if}

    <div class="items">
      {#each cloneGroups as group, i (i)}
        <div class="item-card" class:item-selected={selected.has(i)}>
          <div class="item-main">
            <label class="check-label">
              <input
                type="checkbox"
                checked={selected.has(i)}
                onchange={() => toggleSelect(i)}
              />
              <div class="badges">
                {#if group.token_count != null}
                  <span class="badge">{group.token_count} tokens</span>
                {/if}
                {#if group.line_count != null}
                  <span class="badge">{group.line_count} lines</span>
                {/if}
                {#if Array.isArray(group.instances)}
                  <span class="badge">{group.instances.length} files</span>
                {/if}
              </div>
            </label>
            <button type="button" class="copy-btn" onclick={() => copyItem(group, i)}>
              {copiedItem === i ? '✓' : 'copy'}
            </button>
          </div>
          {#if Array.isArray(group.instances)}
            <div class="instance-list">
              {#each group.instances as inst, j (inst.file ? `${inst.file}:${inst.start_line}` : j)}
                <span class="filepath">
                  {inst.file ?? '—'}{#if inst.start_line != null && inst.end_line != null}:{inst.start_line}-{inst.end_line}{/if}
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
  .selection-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    margin-bottom: 6px;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 4px;
  }
  .selection-count {
    font-size: 10px;
    color: var(--color-accent);
    margin-right: auto;
  }
  .bar-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-text);
    cursor: pointer;
    transition: background 0.1s;
  }
  .bar-btn:hover { background: var(--color-hover); }
  .bar-btn.dim { color: var(--color-dim); }
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
    transition: border-color 0.1s;
  }
  .item-selected {
    border-color: var(--color-accent);
  }
  .item-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .check-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .check-label input {
    accent-color: var(--color-accent);
    cursor: pointer;
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
  .copy-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .copy-btn:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
  .instance-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: 4px;
    padding-left: 22px;
  }
  .toggle-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    margin-top: 4px;
    margin-left: 22px;
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
    margin-left: 22px;
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
