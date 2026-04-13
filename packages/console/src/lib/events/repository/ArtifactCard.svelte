<script lang="ts">
  import { formatBytes, relativeTime } from '../helpers';

  let {
    name,
    size,
    uploaded,
    contentUrl,
  }: {
    name: string;
    size: number;
    uploaded: string;
    contentUrl: string;
  } = $props();

  let expanded = $state(false);
  let content: string | null = $state(null);
  let contentType: string | null = $state(null);
  let fetchError: string | null = $state(null);
  let loading = $state(false);
  let fetched = $state(false);
  let view = $state<'report' | 'raw'>('report');

  const isText = $derived.by(() => {
    const ct = contentType;
    return ct !== null && (ct.startsWith('text/') || ct.includes('json'));
  });

  const parsedJson = $derived.by(() => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  });

  const formattedJson = $derived(parsedJson ? JSON.stringify(parsedJson, null, 2) : content);

  async function toggle() {
    expanded = !expanded;
    if (expanded && !fetched) {
      loading = true;
      fetchError = null;
      try {
        const res = await fetch(contentUrl);
        if (res.ok) {
          contentType = res.headers.get('Content-Type');
          const ct = contentType ?? '';
          if (ct.startsWith('text/') || ct.includes('json') || ct.includes('xml')) {
            const text = await res.text();
            content = text || null;
          } else {
            content = null;
          }
        } else if (res.status === 404) {
          fetchError = 'Artifact not found';
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
    <span class="name">{name}</span>
    <span class="size">{formatBytes(size)}</span>
    <span class="time">{relativeTime(uploaded)}</span>
    <span class="chevron" class:open={expanded}>&#x25BE;</span>
  </button>

  {#if expanded}
    <div class="body">
      {#if loading}
        <span class="placeholder">Loading artifact...</span>
      {:else if fetchError}
        <span class="placeholder">{fetchError}</span>
      {:else if !isText || !content}
        <a class="download-link" href={contentUrl} download={name}>Download {name}</a>
      {:else}
        {#if parsedJson}
          <div class="tabs">
            <button
              type="button"
              class="tab"
              class:tab-active={view === 'report'}
              onclick={() => view = 'report'}
            >Formatted</button>
            <button
              type="button"
              class="tab"
              class:tab-active={view === 'raw'}
              onclick={() => view = 'raw'}
            >Raw</button>
          </div>
          {#if view === 'report'}
            <pre class="content-pre">{formattedJson}</pre>
          {:else}
            <pre class="content-pre">{content}</pre>
          {/if}
        {:else}
          <pre class="content-pre">{content}</pre>
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

  .name {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .size {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    flex-shrink: 0;
  }

  .time {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex-shrink: 0;
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
  }

  .placeholder {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .download-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
  }
  .download-link:hover {
    text-decoration: underline;
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
