<script lang="ts">
  import FallowReport from './FallowReport.svelte';
  import { getToolDef } from './tools';

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
  let fetchError: string | null = $state(null);
  let loading = $state(false);
  let fetched = $state(false);
  let view = $state<'report' | 'json'>('report');

  const toolDef = $derived(getToolDef(category, name));

  const parsedJson = $derived.by(() => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  });

  const formattedJson = $derived(parsedJson ? JSON.stringify(parsedJson, null, 2) : content);

  const headline = $derived.by(() => {
    if (toolDef?.headline) {
      const h = toolDef.headline(summary);
      if (h) {
        return h.unit ? `${h.value} ${h.unit}` : h.value;
      }
    }
    return summary;
  });

  async function toggle() {
    expanded = !expanded;
    if (expanded && !fetched) {
      loading = true;
      fetchError = null;
      try {
        const res = await fetch(artifactUrl);
        if (res.ok) {
          const text = await res.text();
          content = text || null;
        } else if (res.status === 404) {
          fetchError = 'Artifact not available for this branch';
        } else {
          fetchError = `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;
        }
      } catch (err) {
        fetchError = String(err);
      } finally {
        loading = false;
        fetched = true;
      }
    }
  }
</script>

<div class="card" class:card-expanded={expanded}>
  <button type="button" class="header" onclick={toggle}>
    <span
      class="dot"
      class:success={outcome === 'success'}
      class:failure={outcome !== 'success'}
      aria-hidden="true"
    ></span>
    {#if toolDef?.glyph}
      <span class="glyph" aria-hidden="true">{toolDef.glyph}</span>
    {/if}
    <span class="label">
      <span class="label-category">{category}</span>
      <span class="label-sep">/</span>
      <span class="label-name">{name}</span>
    </span>
    {#if headline}
      <span class="headline" title={summary ?? ''}>{headline}</span>
    {/if}
    <span class="chevron" class:open={expanded}>▾</span>
  </button>

  {#if expanded}
    <div class="body">
      {#if loading}
        <span class="placeholder">Loading artifact…</span>
      {:else if fetchError}
        <span class="placeholder">{fetchError}</span>
      {:else if !content}
        <span class="placeholder">No artifact available</span>
      {:else}
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
          {#if parsedJson}
            <FallowReport data={parsedJson} />
          {:else}
            <pre class="content-pre">{content}</pre>
          {/if}
        {:else}
          <pre class="content-pre">{formattedJson}</pre>
        {/if}
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
    transition: border-color 0.15s;
  }
  .card-expanded {
    border-color: var(--color-border-bright, var(--color-border));
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
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
    box-shadow: 0 0 6px color-mix(in srgb, var(--color-success) 50%, transparent);
  }
  .dot.failure {
    background: var(--color-danger);
    box-shadow: 0 0 6px color-mix(in srgb, var(--color-danger) 50%, transparent);
  }

  .glyph {
    font-size: 11px;
    color: var(--color-muted);
    flex-shrink: 0;
  }

  .label {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    flex-shrink: 0;
    white-space: nowrap;
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
  }
  .label-category {
    color: var(--color-dim);
  }
  .label-sep {
    color: var(--color-border-bright, var(--color-border));
    padding: 0 1px;
  }
  .label-name {
    color: var(--color-text);
    font-weight: 500;
  }

  .headline {
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
    font-size: 10px;
    color: var(--color-dim);
    transition: transform 0.15s ease;
    display: inline-block;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .body {
    border-top: 1px solid var(--color-border);
    padding: 12px 14px;
    container-type: inline-size;
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
    margin-bottom: 10px;
    width: fit-content;
  }

  .tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 12px;
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
