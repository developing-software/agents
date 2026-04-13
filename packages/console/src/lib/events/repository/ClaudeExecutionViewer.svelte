<script lang="ts">
  import { SvelteSet, SvelteMap } from 'svelte/reactivity';

  let { data }: { data: any[] } = $props();

  // ── Helpers ───────────────────────────────────────────────────────────

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

  function formatCost(usd: number): string {
    return '$' + usd.toFixed(2);
  }

  function toolPreview(name: string, input: any): string | null {
    if (!input || typeof input !== 'object') return null;
    switch (name) {
      case 'Bash': return input.command ?? input.cmd ?? null;
      case 'Read': return input.file_path ?? null;
      case 'Write': return input.file_path ?? null;
      case 'Edit': return input.file_path ?? null;
      case 'Grep': return input.pattern ? `/${input.pattern}/` + (input.path ? ` in ${input.path}` : '') : null;
      case 'Glob': return input.pattern ? input.pattern + (input.path ? ` in ${input.path}` : '') : null;
      case 'Agent': return input.description ?? null;
      case 'WebSearch': return input.query ?? null;
      case 'WebFetch': return input.url ?? null;
      case 'LSP': return input.method ?? null;
      case 'Skill': return input.skill ?? null;
      default: return null;
    }
  }

  function getTextContent(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
    }
    return '';
  }

  // ── Derived data ──────────────────────────────────────────────────────

  const resultEntry = $derived(
    data.findLast((e: any) => e.type === 'result') as any | undefined,
  );

  const model = $derived(resultEntry?.model ?? 'unknown');
  const numTurns = $derived(resultEntry?.num_turns ?? 0);
  const totalCost = $derived(resultEntry?.total_cost_usd ?? 0);
  const usage = $derived(resultEntry?.usage ?? {});
  const inputTokens = $derived(
    (usage.input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0),
  );
  const outputTokens = $derived(usage.output_tokens ?? 0);

  type ConversationEntry = {
    kind: 'human';
    text: string;
  } | {
    kind: 'assistant-text';
    text: string;
  } | {
    kind: 'tool-use';
    id: string;
    name: string;
    input: any;
  };

  const entries: ConversationEntry[] = $derived.by(() => {
    const result: ConversationEntry[] = [];
    for (const entry of data) {
      if (entry.type === 'human') {
        const text = getTextContent(entry.message?.content);
        if (text.trim()) {
          result.push({ kind: 'human', text });
        }
      } else if (entry.type === 'assistant') {
        const blocks = entry.message?.content;
        if (Array.isArray(blocks)) {
          for (const block of blocks) {
            if (block.type === 'text' && block.text?.trim()) {
              result.push({ kind: 'assistant-text', text: block.text });
            } else if (block.type === 'tool_use') {
              result.push({
                kind: 'tool-use',
                id: block.id,
                name: block.name,
                input: block.input,
              });
            }
          }
        }
      }
      // skip 'result' and 'tool_result' types
    }
    return result;
  });

  const toolCounts: { name: string; count: number }[] = $derived.by(() => {
    const counts = new SvelteMap<string, number>();
    for (const entry of entries) {
      if (entry.kind === 'tool-use') {
        counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
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
      <span class="summary-value">{numTurns}</span>
    </span>
    <span class="summary-sep"></span>
    <span class="summary-item">
      <span class="summary-label">Cost</span>
      <span class="summary-value cost">{formatCost(totalCost)}</span>
    </span>
    <span class="summary-sep"></span>
    <span class="summary-item">
      <span class="summary-label">Tokens</span>
      <span class="summary-value">{formatTokens(inputTokens)} in / {formatTokens(outputTokens)} out</span>
    </span>
  </div>

  <!-- Conversation timeline -->
  <div class="timeline">
    {#each entries as entry, i (i)}
      {#if entry.kind === 'human'}
        <button
          type="button"
          class="row row-human"
          onclick={() => toggleRow(i)}
        >
          <span class="row-label label-human">User</span>
          <span
            class="row-text"
            class:row-text-clamped-2={!expandedRows.has(i)}
          >{entry.text}</span>
        </button>
      {:else if entry.kind === 'assistant-text'}
        <button
          type="button"
          class="row row-assistant"
          onclick={() => toggleRow(i)}
        >
          <span class="row-label label-assistant">Assistant</span>
          <span
            class="row-text"
            class:row-text-clamped-4={!expandedRows.has(i)}
          >{entry.text}</span>
        </button>
      {:else if entry.kind === 'tool-use'}
        {@const preview = toolPreview(entry.name, entry.input)}
        <button
          type="button"
          class="row row-tool"
          onclick={() => toggleRow(i)}
        >
          <span class="row-label label-tool">Tool</span>
          <span class="tool-pill">{entry.name}</span>
          {#if preview}
            <span class="tool-preview">{preview}</span>
          {/if}
          <span class="expand-hint">{expandedRows.has(i) ? '\u25B4' : '\u25BE'}</span>
        </button>
        {#if expandedRows.has(i)}
          <div class="tool-detail">
            <pre class="tool-input">{JSON.stringify(entry.input, null, 2)}</pre>
          </div>
        {/if}
      {/if}
    {/each}
  </div>

  <!-- Tool usage summary -->
  {#if toolCounts.length > 0}
    <div class="tool-summary">
      <span class="section-heading">Tool Usage</span>
      <div class="tool-grid">
        <span class="tool-grid-header">Tool Name</span>
        <span class="tool-grid-header tool-grid-count">Count</span>
        {#each toolCounts as tool (tool.name)}
          <span class="tool-grid-name">{tool.name}</span>
          <span class="tool-grid-value">{tool.count}</span>
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

  .summary-value.cost {
    color: var(--color-success);
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

  .row-label {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
    flex-shrink: 0;
    line-height: 1.6;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .label-human {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
  }

  .label-assistant {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .label-tool {
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
  }

  .row-text {
    color: var(--color-muted);
    white-space: pre-wrap;
    word-break: break-word;
    min-width: 0;
    flex: 1;
    line-height: 1.5;
  }

  .row-text-clamped-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .row-text-clamped-4 {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tool-pill {
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--color-warning) 12%, transparent);
    color: var(--color-warning);
    flex-shrink: 0;
    line-height: 1.6;
  }

  .tool-preview {
    color: var(--color-muted);
    font-size: 10px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .expand-hint {
    color: var(--color-dim);
    font-size: 10px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .tool-detail {
    background: var(--color-bg);
    padding: 8px 10px 8px 32px;
  }

  .tool-input {
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

  /* ── Tool usage summary ── */
  .tool-summary {
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

  .tool-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 16px;
    padding: 8px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 11px;
  }

  .tool-grid-header {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--color-border);
  }

  .tool-grid-count {
    text-align: right;
  }

  .tool-grid-name {
    color: var(--color-muted);
    padding: 2px 0;
  }

  .tool-grid-value {
    color: var(--color-text);
    text-align: right;
    padding: 2px 0;
  }
</style>
