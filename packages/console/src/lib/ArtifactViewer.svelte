<script lang="ts">
  let { name, url }: { name: string; url: string } = $props();

  type FetchState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ok'; text: string };

  let fetchState = $state<FetchState>({ status: 'loading' });

  $effect(() => {
    const targetUrl = url;
    fetchState = { status: 'loading' };
    let cancelled = false;

    fetch(targetUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) fetchState = { status: 'ok', text };
      })
      .catch((err: unknown) => {
        if (!cancelled)
          fetchState = {
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          };
      });

    return () => {
      cancelled = true;
    };
  });

  type FileKind = 'execution' | 'metrics' | 'json' | 'text';

  const kind = $derived.by((): FileKind => {
    if (name === 'execution.json' || name === 'claude_code_execution.json') return 'execution';
    if (name === 'metrics.txt') return 'metrics';
    if (name.endsWith('.json')) return 'json';
    return 'text';
  });

  const content = $derived(fetchState.status === 'ok' ? fetchState.text : null);

  // ── Execution kind ──────────────────────────────────────────────────

  type ExecutionEntry = {
    type: string;
    subtype?: string;
    model?: string;
    message?: {
      content?: Array<{ type: string; name?: string; [key: string]: unknown }>;
    };
    duration_ms?: number;
    num_turns?: number;
    result?: string;
    total_cost_usd?: number;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };

  type ExecutionData = {
    model: string;
    turns: number;
    durationMs: number;
    cost: number;
    status: 'success' | 'error' | 'unknown';
    result: string;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
    topTools: Array<{ name: string; count: number }>;
  };

  const executionData = $derived.by((): ExecutionData | null => {
    if (kind !== 'execution' || !content) return null;
    try {
      const entries: ExecutionEntry[] = JSON.parse(content);
      const init = entries.find((e) => e.type === 'system' && e.subtype === 'init');
      const resultEntry = entries.find((e) => e.type === 'result');

      const toolCounts: Record<string, number> = {};
      for (const entry of entries) {
        if (entry.type === 'assistant' && entry.message?.content) {
          for (const block of entry.message.content) {
            if (block.type === 'tool_use' && block.name) {
              toolCounts[block.name] = (toolCounts[block.name] ?? 0) + 1;
            }
          }
        }
      }

      const topTools = Object.entries(toolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([toolName, count]) => ({ name: toolName, count }));

      return {
        model: init?.model ?? 'unknown',
        turns: resultEntry?.num_turns ?? 0,
        durationMs: resultEntry?.duration_ms ?? 0,
        cost: resultEntry?.total_cost_usd ?? 0,
        status:
          resultEntry?.subtype === 'success'
            ? 'success'
            : resultEntry?.subtype === 'error'
              ? 'error'
              : 'unknown',
        result: resultEntry?.result ?? '',
        inputTokens: resultEntry?.usage?.input_tokens ?? 0,
        outputTokens: resultEntry?.usage?.output_tokens ?? 0,
        cacheTokens:
          (resultEntry?.usage?.cache_read_input_tokens ?? 0) +
          (resultEntry?.usage?.cache_creation_input_tokens ?? 0),
        topTools,
      };
    } catch {
      return null;
    }
  });

  function formatDuration(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatCost(usd: number): string {
    return `$${usd.toFixed(3)}`;
  }

  // ── Metrics kind ────────────────────────────────────────────────────

  type MetricRow = { key: string; value: string };

  const metricsRows = $derived.by((): MetricRow[] => {
    if (kind !== 'metrics' || !content) return [];
    return content
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('=');
        if (idx === -1) return null;
        return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      })
      .filter((r): r is MetricRow => r !== null && r.key.length > 0);
  });

  // ── JSON kind ───────────────────────────────────────────────────────

  const prettyJson = $derived.by((): string => {
    if (kind !== 'json' || !content) return '';
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content ?? '';
    }
  });
</script>

<div class="av-root">
  {#if fetchState.status === 'loading'}
    <span class="av-loading">loading...</span>
  {:else if fetchState.status === 'error'}
    <span class="av-error">{fetchState.message}</span>
  {:else if kind === 'execution'}
    {#if executionData}
      <div class="av-exec-summary">
        <span class="av-model">{executionData.model}</span>
        <span class="av-sep">·</span>
        <span class="av-stat">{executionData.turns} turns</span>
        <span class="av-sep">·</span>
        <span class="av-stat">{formatDuration(executionData.durationMs)}</span>
        <span class="av-sep">·</span>
        <span class="av-stat">{formatCost(executionData.cost)}</span>
        <span
          class="av-status-badge"
          class:av-status-success={executionData.status === 'success'}
          class:av-status-error={executionData.status === 'error'}
        >{executionData.status}</span>
      </div>
      <div class="av-tokens">
        <span class="av-token-label">in:</span>
        <span class="av-token-val">{executionData.inputTokens.toLocaleString()}</span>
        <span class="av-sep">·</span>
        <span class="av-token-label">out:</span>
        <span class="av-token-val">{executionData.outputTokens.toLocaleString()}</span>
        <span class="av-sep">·</span>
        <span class="av-token-label">cache:</span>
        <span class="av-token-val">{executionData.cacheTokens.toLocaleString()}</span>
      </div>
      {#if executionData.topTools.length > 0}
        <div class="av-tools">
          {#each executionData.topTools as tool (tool.name)}
            <span class="av-tool-pill"
              >{tool.name}<span class="av-tool-count">{tool.count}</span></span
            >
          {/each}
        </div>
      {/if}
      {#if executionData.result}
        <pre class="av-pre av-result">{executionData.result}</pre>
      {/if}
    {:else}
      <pre class="av-pre">{content}</pre>
    {/if}
  {:else if kind === 'metrics'}
    {#if metricsRows.length > 0}
      <table class="av-metrics-table">
        <tbody>
          {#each metricsRows as row (row.key)}
            <tr>
              <td class="av-metric-key">{row.key}</td>
              <td class="av-metric-val">{row.value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <pre class="av-pre">{content}</pre>
    {/if}
  {:else if kind === 'json'}
    <pre class="av-pre av-json">{prettyJson}</pre>
  {:else}
    <pre class="av-pre">{content}</pre>
  {/if}
</div>

<style>
  .av-root {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .av-loading {
    color: var(--color-dim);
    font-style: italic;
  }

  .av-error {
    color: var(--color-danger, #e06c75);
  }

  /* ── Execution ── */
  .av-exec-summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 5px;
  }

  .av-model {
    color: var(--color-accent);
    font-size: 11px;
  }

  .av-sep {
    color: var(--color-border-bright, var(--color-dim));
    font-size: 10px;
  }

  .av-stat {
    color: var(--color-muted);
    font-size: 11px;
  }

  .av-status-badge {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-dim);
    border: 1px solid var(--color-border);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .av-status-success {
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
    border-color: color-mix(in srgb, var(--color-success) 30%, transparent);
  }

  .av-status-error {
    background: color-mix(in srgb, var(--color-danger, #e06c75) 12%, transparent);
    color: var(--color-danger, #e06c75);
    border-color: color-mix(in srgb, var(--color-danger, #e06c75) 30%, transparent);
  }

  .av-tokens {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
    font-size: 11px;
  }

  .av-token-label {
    color: var(--color-dim);
  }

  .av-token-val {
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }

  .av-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }

  .av-tool-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
    color: var(--color-accent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  .av-tool-count {
    color: color-mix(in srgb, var(--color-accent) 65%, transparent);
    font-size: 10px;
  }

  /* ── Shared pre ── */
  .av-pre {
    margin: 0;
    padding: 6px 8px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    white-space: pre-wrap;
    word-break: break-word;
    overflow-y: auto;
  }

  .av-result {
    max-height: 120px;
    color: var(--color-muted);
  }

  .av-json {
    max-height: 200px;
  }

  /* ── Metrics table ── */
  .av-metrics-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .av-metrics-table tr:not(:last-child) td {
    border-bottom: 1px solid var(--color-border);
  }

  .av-metric-key {
    padding: 3px 8px 3px 0;
    color: var(--color-dim);
    white-space: nowrap;
    vertical-align: top;
    width: 40%;
    font-family: "JetBrains Mono", monospace;
  }

  .av-metric-val {
    padding: 3px 0;
    color: var(--color-text);
    font-family: "JetBrains Mono", monospace;
    word-break: break-word;
  }
</style>
