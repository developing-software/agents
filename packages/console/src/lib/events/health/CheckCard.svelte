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
  let fetchDiagnostic = $state<{ tried: string[]; available: string[]; truncated: boolean } | null>(null);
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
      fetchDiagnostic = null;
      try {
        const res = await fetch(artifactUrl);
        if (res.ok) {
          const text = await res.text();
          content = text || null;
        } else {
          fetchError = `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;
          // The 404 body is JSON with tried/available keys — surface it so
          // the user can see the mismatch between expected and actual R2 keys.
          try {
            const body = (await res.json()) as {
              tried?: unknown;
              available?: unknown;
              truncated?: unknown;
            };
            if (body && Array.isArray(body.tried)) {
              fetchDiagnostic = {
                tried: body.tried as string[],
                available: Array.isArray(body.available) ? (body.available as string[]) : [],
                truncated: !!body.truncated,
              };
            }
          } catch {
            /* body was not JSON — ignore */
          }
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
        <div class="fetch-error">
          <span class="placeholder">Failed to load artifact ({fetchError})</span>
          {#if fetchDiagnostic}
            <div class="diagnostic">
              <div class="diagnostic-label">Tried keys</div>
              <ul class="diagnostic-list">
                {#each fetchDiagnostic.tried as k (k)}
                  <li><code>{k}</code></li>
                {/each}
              </ul>
              <div class="diagnostic-label">
                Found under branch prefix{fetchDiagnostic.truncated ? ' (first 20)' : ''}
              </div>
              {#if fetchDiagnostic.available.length > 0}
                <ul class="diagnostic-list">
                  {#each fetchDiagnostic.available as k (k)}
                    <li><code>{k}</code></li>
                  {/each}
                </ul>
              {:else}
                <div class="diagnostic-empty">nothing — the branch has no artifacts in R2</div>
              {/if}
            </div>
          {/if}
        </div>
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

  .fetch-error {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .diagnostic {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: 3px;
  }

  .diagnostic-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-dim);
    margin-top: 4px;
  }

  .diagnostic-label:first-child {
    margin-top: 0;
  }

  .diagnostic-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .diagnostic-list li {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-text);
    word-break: break-all;
  }

  .diagnostic-list code {
    background: none;
    padding: 0;
    color: inherit;
  }

  .diagnostic-empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    font-style: italic;
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
