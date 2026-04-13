<script lang="ts">
  import type { ContextFile } from './config-types';

  let {
    files,
    maxFiles = 10,
    handleRemove,
  }: {
    files: ContextFile[];
    maxFiles?: number;
    handleRemove?: (path: string) => void;
  } = $props();

  let collapsed = $state(false);
  let expanded = $state<Record<string, boolean>>({});

  function toggle(path: string) {
    expanded[path] = !expanded[path];
  }

  function formatSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<section class="context-card">
  <header class="context-header">
    <button type="button" class="collapse" onclick={() => (collapsed = !collapsed)}>
      {collapsed ? '▸' : '▾'} Context Files ({files.length})
    </button>
  </header>

  {#if !collapsed}
    {#if files.length > maxFiles}
      <div class="warning">Context limit exceeded ({files.length}/{maxFiles}). Consider removing files.</div>
    {/if}

    {#if files.length === 0}
      <div class="empty">No files in AI context.</div>
    {:else}
      <ul class="file-list">
        {#each files as file (file.path)}
          <li class="file-item">
            <div class="file-row">
              <div class="meta">
                <span class="path">{file.path}</span>
                <span class="pill">{file.language}</span>
                <span class="size">{formatSize(file.size)}</span>
              </div>

              <div class="actions">
                <button type="button" class="btn" onclick={() => toggle(file.path)}>
                  {expanded[file.path] ? 'Hide' : 'Preview'}
                </button>
                <button type="button" class="btn btn-danger" onclick={() => handleRemove?.(file.path)}>Remove</button>
              </div>
            </div>

            {#if expanded[file.path]}
              <pre class="preview"><code>{file.content}</code></pre>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<style>
  .context-card {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    min-height: 0;
  }

  .context-header {
    border-bottom: 1px solid var(--color-border);
    padding: 8px 10px;
  }

  .collapse {
    border: none;
    background: transparent;
    color: var(--color-text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    padding: 0;
  }

  .warning {
    margin: 10px;
    border: 1px solid color-mix(in srgb, var(--color-warning) 20%, transparent);
    background: color-mix(in srgb, var(--color-warning) 8%, transparent);
    color: var(--color-warning);
    border-radius: 6px;
    padding: 8px;
    font-size: 12px;
  }

  .empty {
    font-size: 12px;
    color: var(--color-dim);
    padding: 12px 10px;
  }

  .file-list {
    list-style: none;
    margin: 0;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 320px;
    overflow: auto;
  }

  .file-item {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-elevated);
    padding: 8px;
  }

  .file-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .meta {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .path {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    word-break: break-all;
  }

  .pill,
  .size {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-dim);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 1px 5px;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .btn {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-muted);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    padding: 3px 7px;
    cursor: pointer;
  }

  .btn-danger {
    color: var(--color-danger);
  }

  .preview {
    margin: 8px 0 0;
    max-height: 240px;
    overflow: auto;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-bg);
    color: var(--color-text);
    padding: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    line-height: 1.5;
  }
</style>
