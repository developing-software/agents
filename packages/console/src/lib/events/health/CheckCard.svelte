<script lang="ts">
  import FallowReport from './FallowReport.svelte';

  interface Props {
    category: string;
    name: string;
    outcome: string;
    summary: string | null;
    artifactUrl: string;
  }

  let {
    category,
    name,
    outcome,
    summary,
    artifactUrl,
  }: Props = $props();

  let expanded = $state(false);
  let content: string | null = $state(null);
  let contentType: string | null = $state(null);
  let loading = $state(false);
  let fetched = $state(false);
  let view = $state<'report' | 'json'>('report');

  const parsedJson = $derived.by(() => {
    if (!content || contentType !== 'application/json') return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  });

  const formattedJson = $derived(parsedJson ? JSON.stringify(parsedJson, null, 2) : null);

  async function toggle() {
    expanded = !expanded;
    if (expanded && !fetched) {
      loading = true;
      try {
        const res = await fetch(artifactUrl);
        if (res.ok) {
          content = await res.text();
          contentType = res.headers.get('content-type');
        }
      } catch {
        // leave content null
      } finally {
        loading = false;
        fetched = true;
      }
    }
  }
</script>

<div class="card">
  <button type="button" class="header" onclick={toggle}>
    <span
      class="dot"
      class:success={outcome === 'success'}
      class:failure={outcome !== 'success'}
    ></span>
    <span class="label">{category}/{name}</span>
    {#if summary}
      <span class="summary">{summary}</span>
    {/if}
    <span class="chevron" class:open={expanded}></span>
  </button>

  {#if expanded}
    <div class="body">
      {#if loading}
        <span class="placeholder">Loading...</span>
      {:else if content === null}
        <span class="placeholder">No artifact available</span>
      {:else if parsedJson}
        <div class="tabs">
          <button
            type="button"
            class="tab"
            class:tab-active={view === 'report'}
            onclick={() => view = 'report'}
          >Report</button>
          <button
            type="button"
            class="tab"
            class:tab-active={view === 'json'}
            onclick={() => view = 'json'}
          >JSON</button>
        </div>
        {#if view === 'report'}
          <FallowReport data={parsedJson} />
        {:else}
          <pre class="content-pre">{formattedJson}</pre>
        {/if}
      {:else}
        <pre class="content-pre">{content}</pre>
      {/if}
    </div>
  {/if}
</div>

<style>
  .card {
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font-family: inherit;
    transition: background 0.1s;
  }

  .header:hover {
    background: var(--color-hover);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot.success {
    background: var(--color-success);
  }

  .dot.failure {
    background: var(--color-danger);
  }

  .label {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    color: var(--color-text);
    flex-shrink: 0;
    white-space: nowrap;
  }

  .summary {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
  }

  .chevron {
    flex-shrink: 0;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid var(--color-dim);
    transition: transform 0.15s ease;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .body {
    border-top: 1px solid var(--color-border);
    padding: 8px 10px;
  }

  .placeholder {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .content-pre {
    margin: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    max-height: 400px;
    overflow-x: auto;
    overflow-y: auto;
    padding: 8px;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--color-text);
  }

  .tabs {
    display: flex;
    gap: 2px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px;
    margin-bottom: 8px;
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

  .tab:hover {
    color: var(--color-muted);
  }

  .tab-active {
    background: var(--color-surface);
    color: var(--color-text);
  }
</style>
