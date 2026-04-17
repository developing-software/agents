<script lang="ts">
  import { SvelteSet, SvelteMap } from 'svelte/reactivity';

  let { data }: { data: any } = $props();

  // ── Helpers ───────────────────────────────────────────────────────────

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

  function formatCost(usd: number): string {
    return '$' + usd.toFixed(2);
  }

  function toolPreview(name: string, args: any): string | null {
    if (!args || typeof args !== 'object') return null;
    const n = name.toLowerCase();
    // OpenCode tool names
    if (n === 'shell' || n === 'bash') return args.command ?? args.cmd ?? null;
    if (n === 'read_file' || n === 'read') return args.file_path ?? args.path ?? null;
    if (n === 'write_file' || n === 'write') return args.file_path ?? args.path ?? null;
    if (n === 'edit_file' || n === 'edit') return args.file_path ?? args.path ?? null;
    if (n === 'grep' || n === 'search') return args.pattern ? `/${args.pattern}/` + (args.path ? ` in ${args.path}` : '') : null;
    if (n === 'glob' || n === 'find') return args.pattern ? args.pattern + (args.path ? ` in ${args.path}` : '') : null;
    if (n === 'web_search' || n === 'websearch') return args.query ?? null;
    if (n === 'web_fetch' || n === 'webfetch') return args.url ?? null;
    if (n === 'agent') return args.description ?? null;
    return null;
  }

  // ── Derived data ──────────────────────────────────────────────────────

  const messages: any[] = $derived(data?.messages ?? []);

  const model = $derived.by(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.info?.role === 'assistant' && messages[i]?.info?.modelID) {
        return messages[i].info.modelID;
      }
    }
    return 'unknown';
  });

  const numTurns = $derived(
    messages.filter((m: any) => m?.info?.role === 'assistant').length,
  );

  const totalCost = $derived(
    messages.reduce((sum: number, m: any) => sum + (m?.info?.cost ?? 0), 0),
  );

  const totalInputTokens = $derived(
    messages.reduce((sum: number, m: any) => sum + (m?.info?.tokens?.input ?? 0), 0),
  );

  const totalOutputTokens = $derived(
    messages.reduce((sum: number, m: any) => sum + (m?.info?.tokens?.output ?? 0), 0),
  );

  // ── Conversation entries ──────────────────────────────────────────────

  type ConversationEntry =
    | { kind: 'user'; text: string }
    | { kind: 'system'; text: string }
    | { kind: 'assistant-text'; text: string }
    | { kind: 'tool-use'; name: string; args: any; callId?: string };

  const entries: ConversationEntry[] = $derived.by(() => {
    const result: ConversationEntry[] = [];
    for (const msg of messages) {
      const role = msg?.info?.role;
      const parts: any[] = msg?.parts ?? [];

      if (role === 'user') {
        const text = parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('\n');
        if (text.trim()) {
          result.push({ kind: 'user', text });
        }
      } else if (role === 'system') {
        const text = parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('\n');
        if (text.trim()) {
          result.push({ kind: 'system', text });
        }
      } else if (role === 'assistant') {
        for (const part of parts) {
          if (part.type === 'text' && part.text?.trim()) {
            result.push({ kind: 'assistant-text', text: part.text });
          } else if (part.type === 'tool-invocation') {
            result.push({
              kind: 'tool-use',
              name: part.toolName,
              args: part.args,
              callId: part.toolCallId,
            });
          }
          // skip tool-result parts
        }
      }
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
      <span class="summary-value">{formatTokens(totalInputTokens)} in / {formatTokens(totalOutputTokens)} out</span>
    </span>
  </div>

  <!-- Conversation timeline -->
  <div class="timeline">
    {#each entries as entry, i (i)}
      {#if entry.kind === 'user'}
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
      {:else if entry.kind === 'system'}
        <button
          type="button"
          class="row row-system"
          onclick={() => toggleRow(i)}
        >
          <span class="row-label label-system">System</span>
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
        {@const preview = toolPreview(entry.name, entry.args)}
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
            <pre class="tool-input">{JSON.stringify(entry.args, null, 2)}</pre>
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

  .label-system {
    background: color-mix(in srgb, var(--color-dim) 15%, transparent);
    color: var(--color-dim);
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
