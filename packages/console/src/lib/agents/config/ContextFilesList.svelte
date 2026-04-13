<script lang="ts">
  import type { ContextFile } from './config-types';
  import { inferLanguage } from './config-types';

  let {
    files = $bindable(),
  }: {
    files: ContextFile[];
  } = $props();

  let collapsed = $state(false);

  function removeFile(path: string) {
    files = files.filter((f) => f.path !== path);
  }

  function truncate(content: string, lines: number): string {
    const split = content.split('\n');
    if (split.length <= lines) return content;
    return split.slice(0, lines).join('\n') + '\n...';
  }
</script>

<div class="context-section">
  <button type="button" class="section-header" onclick={() => { collapsed = !collapsed; }}>
    <span class="chevron" class:chevron-collapsed={collapsed}>&#9662;</span>
    <span class="section-title">Context Files</span>
    {#if files.length > 0}
      <span class="file-count">{files.length}</span>
    {/if}
  </button>

  {#if !collapsed}
    <div class="file-list">
      {#if files.length === 0}
        <p class="empty-msg">No files selected. Add files from the tree navigator to include them in AI chat context.</p>
      {:else}
        {#each files as file (file.path)}
          <div class="context-file">
            <div class="file-header">
              <span class="file-info">
                <span class="file-path">{file.path}</span>
                <span class="file-lang">{inferLanguage(file.path)}</span>
              </span>
              <button type="button" class="remove-btn" onclick={() => removeFile(file.path)} title="Remove from context">
                &times;
              </button>
            </div>
            <pre class="file-preview"><code>{truncate(file.content, 8)}</code></pre>
          </div>
        {/each}
      {/if}
      {#if files.length >= 10}
        <p class="limit-warning">Maximum of 10 context files recommended for best results.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .context-section {
    display: flex;
    flex-direction: column;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    transition: color 0.1s;
  }
  .section-header:hover { color: var(--color-text); }

  .chevron {
    font-size: 9px;
    transition: transform 0.15s;
    color: var(--color-dim);
  }
  .chevron-collapsed { transform: rotate(-90deg); }

  .section-title { flex: 1; text-align: left; }

  .file-count {
    font-size: 9px;
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
    padding: 1px 6px;
    border-radius: 8px;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 4px;
  }

  .empty-msg {
    font-size: 11px;
    color: var(--color-dim);
    line-height: 1.5;
    padding: 4px 0;
  }

  .context-file {
    border: 1px solid var(--color-border);
    border-radius: 3px;
    overflow: hidden;
  }

  .file-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: var(--color-elevated);
    border-bottom: 1px solid var(--color-border);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .file-path {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-lang {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-dim);
    background: var(--color-surface);
    padding: 0 4px;
    border-radius: 2px;
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--color-dim);
    font-size: 14px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    flex-shrink: 0;
  }
  .remove-btn:hover { color: var(--color-danger); }

  .file-preview {
    margin: 0;
    padding: 6px 8px;
    background: var(--color-bg);
    max-height: 120px;
    overflow: hidden;
  }
  .file-preview code {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    line-height: 1.5;
    white-space: pre;
  }

  .limit-warning {
    font-size: 10px;
    color: var(--color-warning);
    padding: 2px 0;
  }
</style>
