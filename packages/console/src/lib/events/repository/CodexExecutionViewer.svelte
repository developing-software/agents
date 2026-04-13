<script lang="ts">
  import { SvelteSet, SvelteMap } from 'svelte/reactivity';

  let { content }: { content: string } = $props();

  // ── Helpers ───────────────────────────────────────────────────────────

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

  function safeParse(line: string): Record<string, any> | null {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }

  // ── Parse JSONL into entries ──────────────────────────────────────────

  type ParsedEntry = {
    index: number;
    type: string;
    payload: any;
    raw: Record<string, any>;
  };

  const entries: ParsedEntry[] = $derived.by(() => {
    const lines = content.split('\n').filter((l) => l.trim());
    const result: ParsedEntry[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parsed = safeParse(lines[i]);
      if (!parsed) continue;
      result.push({
        index: i,
        type: parsed.type ?? 'unknown',
        payload: parsed.payload ?? {},
        raw: parsed,
      });
    }
    return result;
  });

  // ── Derived summary data ──────────────────────────────────────────────

  const model = $derived.by(() => {
    const last = entries.findLast((e) => e.type === 'turn_context');
    return last?.payload?.model ?? 'unknown';
  });

  const turnIndices = $derived.by(() => {
    const map = new SvelteMap<number, number>();
    let n = 0;
    for (const entry of entries) {
      if (entry.type === 'turn_context') {
        n++;
        map.set(entry.index, n);
      }
    }
    return map;
  });

  const turnCount = $derived(
    entries.filter((e) => e.type === 'turn_context').length,
  );

  const lastTokenEntry = $derived.by(() => {
    return entries.findLast(
      (e) => e.type === 'event_msg' && e.payload?.type === 'token_count',
    );
  });

  const tokenUsage = $derived.by(() => {
    const info = lastTokenEntry?.payload?.info?.total_token_usage;
    if (!info) return null;
    return {
      input: (info.input_tokens ?? 0) + (info.cached_input_tokens ?? 0),
      output: info.output_tokens ?? 0,
      reasoning: info.reasoning_output_tokens ?? 0,
    };
  });

  // ── Event type summary counts ─────────────────────────────────────────

  const typeCounts: { label: string; count: number }[] = $derived.by(() => {
    const counts = new SvelteMap<string, number>();
    for (const entry of entries) {
      let label = entry.type;
      if (entry.type === 'event_msg' && entry.payload?.type) {
        label = `event_msg / ${entry.payload.type}`;
      }
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  });

  // ── Expand/collapse state ─────────────────────────────────────────────

  let expandedRows = new SvelteSet<number>();

  function toggleRow(index: number) {
    if (expandedRows.has(index)) {
      expandedRows.delete(index);
    } else {
      expandedRows.add(index);
    }
  }

  // ── Helpers for message content ─────────────────────────────────────

  function getMessageContent(payload: any): string {
    const c = payload?.content;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) {
      return c
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
    }
    return '';
  }
</script>

<!-- Summary header -->
<div class="viewer">
  <div class="summary-bar">
    <span class="summary-item">
      <span class="summary-label">Model</span>
      <span class="summary-value">{model}</span>
    </span>
    <span class="summary-sep"></span>
    <span class="summary-item">
      <span class="summary-label">Turns</span>
      <span class="summary-value">{turnCount}</span>
    </span>
    {#if tokenUsage}
      <span class="summary-sep"></span>
      <span class="summary-item">
        <span class="summary-label">Tokens</span>
        <span class="summary-value"
          >{formatTokens(tokenUsage.input)} in / {formatTokens(tokenUsage.output)} out</span
        >
      </span>
      {#if tokenUsage.reasoning > 0}
        <span class="summary-sep"></span>
        <span class="summary-item">
          <span class="summary-label">Reasoning</span>
          <span class="summary-value">{formatTokens(tokenUsage.reasoning)}</span>
        </span>
      {/if}
    {/if}
    <span class="summary-sep"></span>
    <span class="summary-item">
      <span class="summary-label">Entries</span>
      <span class="summary-value">{entries.length}</span>
    </span>
  </div>

  <!-- Entry timeline -->
  <div class="timeline">
    {#each entries as entry (entry.index)}
      {#if entry.type === 'turn_context'}
        <!-- Turn divider -->
        <div class="turn-divider">
          <span class="turn-label">Turn {turnIndices.get(entry.index) ?? '?'}</span>
          {#if entry.payload?.model}
            <span class="turn-model">{entry.payload.model}</span>
          {/if}
          <button
            type="button"
            class="turn-expand"
            onclick={() => toggleRow(entry.index)}
          >
            {expandedRows.has(entry.index) ? '\u25B4' : '\u25BE'}
          </button>
        </div>
        {#if expandedRows.has(entry.index)}
          <div class="detail-panel">
            <pre class="detail-json">{JSON.stringify(entry.raw, null, 2)}</pre>
          </div>
        {/if}
      {:else if entry.type === 'message'}
        <!-- Message entry -->
        <button
          type="button"
          class="row"
          onclick={() => toggleRow(entry.index)}
        >
          <span class="badge badge-accent">{entry.type}</span>
          <span class="role-label" class:role-user={entry.payload?.role === 'user'} class:role-assistant={entry.payload?.role === 'assistant'}>
            {entry.payload?.role ?? 'unknown'}
          </span>
          <span
            class="row-text"
            class:row-text-clamped={!expandedRows.has(entry.index)}
          >{getMessageContent(entry.payload)}</span>
          <span class="expand-hint">{expandedRows.has(entry.index) ? '\u25B4' : '\u25BE'}</span>
        </button>
        {#if expandedRows.has(entry.index)}
          <div class="detail-panel">
            <pre class="detail-json">{JSON.stringify(entry.raw, null, 2)}</pre>
          </div>
        {/if}
      {:else if entry.type === 'event_msg'}
        <!-- Event message entry -->
        <button
          type="button"
          class="row"
          onclick={() => toggleRow(entry.index)}
        >
          <span class="badge badge-dim">{entry.type}</span>
          {#if entry.payload?.type}
            <span class="sub-badge">{entry.payload.type}</span>
          {/if}
          <span class="expand-hint">{expandedRows.has(entry.index) ? '\u25B4' : '\u25BE'}</span>
        </button>
        {#if expandedRows.has(entry.index)}
          <div class="detail-panel">
            <pre class="detail-json">{JSON.stringify(entry.raw, null, 2)}</pre>
          </div>
        {/if}
      {:else}
        <!-- Unknown / other entry types -->
        <button
          type="button"
          class="row"
          onclick={() => toggleRow(entry.index)}
        >
          <span class="badge badge-muted">{entry.type}</span>
          <span class="row-text row-text-dim" class:row-text-clamped={!expandedRows.has(entry.index)}>
            {JSON.stringify(entry.payload).slice(0, 200)}
          </span>
          <span class="expand-hint">{expandedRows.has(entry.index) ? '\u25B4' : '\u25BE'}</span>
        </button>
        {#if expandedRows.has(entry.index)}
          <div class="detail-panel">
            <pre class="detail-json">{JSON.stringify(entry.raw, null, 2)}</pre>
          </div>
        {/if}
      {/if}
    {/each}
  </div>

  <!-- Event type summary -->
  {#if typeCounts.length > 0}
    <div class="type-summary">
      <span class="section-heading">Event Summary</span>
      <div class="type-grid">
        <span class="type-grid-header">Type</span>
        <span class="type-grid-header type-grid-count">Count</span>
        {#each typeCounts as item (item.label)}
          <span class="type-grid-name">{item.label}</span>
          <span class="type-grid-value">{item.count}</span>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .viewer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
  }

  /* ── Summary bar ── */
  .summary-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    flex-wrap: wrap;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .summary-label {
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary-value {
    font-size: 11px;
    color: var(--color-text);
  }

  .summary-sep {
    width: 1px;
    height: 12px;
    background: var(--color-border);
    flex-shrink: 0;
  }

  /* ── Timeline ── */
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--color-border);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  /* ── Turn divider ── */
  .turn-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface));
    border: none;
  }

  .turn-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-warning);
  }

  .turn-model {
    font-size: 10px;
    color: var(--color-dim);
  }

  .turn-expand {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--color-dim);
    font-size: 10px;
    cursor: pointer;
    padding: 2px 4px;
    font-family: inherit;
  }

  .turn-expand:hover {
    color: var(--color-muted);
  }

  /* ── Entry rows ── */
  .row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 10px;
    background: var(--color-surface);
    border: none;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    width: 100%;
    transition: background 0.1s;
  }

  .row:hover {
    background: var(--color-elevated);
  }

  /* ── Badges ── */
  .badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
    flex-shrink: 0;
    line-height: 1.6;
    text-transform: lowercase;
    letter-spacing: 0.02em;
  }

  .badge-accent {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
  }

  .badge-dim {
    background: color-mix(in srgb, var(--color-muted) 15%, transparent);
    color: var(--color-muted);
  }

  .badge-muted {
    background: color-mix(in srgb, var(--color-dim) 20%, transparent);
    color: var(--color-dim);
  }

  .sub-badge {
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--color-dim) 12%, transparent);
    color: var(--color-dim);
    flex-shrink: 0;
    line-height: 1.6;
  }

  .role-label {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
    flex-shrink: 0;
    line-height: 1.6;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .role-user {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
  }

  .role-assistant {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  /* ── Row text ── */
  .row-text {
    color: var(--color-muted);
    white-space: pre-wrap;
    word-break: break-word;
    min-width: 0;
    flex: 1;
    line-height: 1.5;
  }

  .row-text-dim {
    color: var(--color-dim);
    font-size: 10px;
  }

  .row-text-clamped {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .expand-hint {
    color: var(--color-dim);
    font-size: 10px;
    margin-left: auto;
    flex-shrink: 0;
  }

  /* ── Detail panel ── */
  .detail-panel {
    background: var(--color-bg);
    padding: 8px 10px 8px 32px;
  }

  .detail-json {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
    line-height: 1.5;
  }

  /* ── Event type summary ── */
  .type-summary {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section-heading {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
  }

  .type-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 16px;
    padding: 8px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 11px;
  }

  .type-grid-header {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--color-border);
  }

  .type-grid-count {
    text-align: right;
  }

  .type-grid-name {
    color: var(--color-muted);
    padding: 2px 0;
  }

  .type-grid-value {
    color: var(--color-text);
    text-align: right;
    padding: 2px 0;
  }
</style>
