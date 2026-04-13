<script lang="ts">
  import { fileLanguage } from "./config-types";
  import type { ContextFile } from "./config-types";

  interface Props {
    files: ContextFile[];
    onremove: (path: string) => void;
  }

  let { files, onremove }: Props = $props();

  const MAX_FILES = 10;

  let collapsed = $state(false);
  let expandedFiles = $state(new Set<string>());

  function toggleFile(path: string) {
    const next = new Set(expandedFiles);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    expandedFiles = next;
  }

  function formatSize(content: string): string {
    const bytes = new TextEncoder().encode(content).length;
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}K`;
  }
</script>

<div class="ctx-panel">
  <button class="ctx-header" onclick={() => (collapsed = !collapsed)}>
    <span class="ctx-title">
      Context Files
      {#if files.length > 0}
        <span class="ctx-count">{files.length}</span>
      {/if}
    </span>
    <span class="collapse-icon">{collapsed ? "▸" : "▾"}</span>
  </button>

  {#if !collapsed}
    {#if files.length === 0}
      <p class="ctx-empty">Click files in the tree to add them to AI context.</p>
    {:else}
      {#if files.length >= MAX_FILES}
        <div class="ctx-warning">
          <span class="warn-icon">⚠</span>
          Max {MAX_FILES} files recommended
        </div>
      {/if}
      <ul class="ctx-list">
        {#each files as file (file.path)}
          {@const isExpanded = expandedFiles.has(file.path)}
          {@const lang = fileLanguage(file.path)}
          <li class="ctx-item">
            <div class="ctx-item-header">
              <button
                class="ctx-toggle"
                onclick={() => toggleFile(file.path)}
                title={file.path}
              >
                <span class="ctx-expand">{isExpanded ? "▾" : "▸"}</span>
                <span class="ctx-path">{file.path}</span>
                <span class="ctx-meta">
                  {#if lang}<span class="lang-badge">{lang}</span>{/if}
                  <span class="size-label">{formatSize(file.content)}</span>
                </span>
              </button>
              <button
                class="ctx-remove"
                onclick={() => onremove(file.path)}
                title="Remove from context"
              >×</button>
            </div>
            {#if isExpanded}
              <pre class="ctx-preview"><code>{file.content.slice(0, 2000)}{file.content.length > 2000 ? "\n… (truncated)" : ""}</code></pre>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Panel                                                               */
  /* ------------------------------------------------------------------ */
  .ctx-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */
  .ctx-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 7px 10px;
    background: var(--color-elevated);
    border: none;
    cursor: pointer;
    text-align: left;
    border-bottom: 1px solid transparent;
  }

  .ctx-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ctx-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 14px;
    padding: 0 4px;
    font-size: 9px;
    border-radius: 7px;
    background: var(--color-accent);
    color: var(--color-bg);
    font-weight: 600;
    line-height: 1;
  }

  .collapse-icon {
    font-size: 10px;
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* Empty / warning                                                     */
  /* ------------------------------------------------------------------ */
  .ctx-empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 10px 12px;
    margin: 0;
    line-height: 1.5;
  }

  .ctx-warning {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-warning, #e89c3c);
    background: color-mix(in srgb, var(--color-warning, #e89c3c) 8%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-warning, #e89c3c) 20%, transparent);
  }

  .warn-icon {
    font-size: 11px;
  }

  /* ------------------------------------------------------------------ */
  /* File list                                                           */
  /* ------------------------------------------------------------------ */
  .ctx-list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
  }

  .ctx-item {
    margin: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .ctx-item:last-child {
    border-bottom: none;
  }

  /* ------------------------------------------------------------------ */
  /* Item header row                                                     */
  /* ------------------------------------------------------------------ */
  .ctx-item-header {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .ctx-toggle {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
    min-width: 0;
    padding: 4px 10px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    transition: color 0.1s;
  }

  .ctx-toggle:hover {
    color: var(--color-text);
  }

  .ctx-expand {
    font-size: 9px;
    color: var(--color-dim);
    flex-shrink: 0;
    width: 10px;
    text-align: center;
  }

  .ctx-path {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }

  .ctx-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .lang-badge {
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 2px;
    background: var(--color-elevated);
    color: var(--color-dim);
    line-height: 1.4;
  }

  .size-label {
    font-size: 9px;
    color: var(--color-dim);
  }

  .ctx-remove {
    padding: 4px 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: "JetBrains Mono", monospace;
    font-size: 14px;
    color: var(--color-dim);
    transition: color 0.1s;
    flex-shrink: 0;
    line-height: 1;
  }

  .ctx-remove:hover {
    color: var(--color-error, #e06c75);
  }

  /* ------------------------------------------------------------------ */
  /* Preview                                                             */
  /* ------------------------------------------------------------------ */
  .ctx-preview {
    margin: 0;
    padding: 8px 12px;
    background: var(--color-elevated);
    border-top: 1px solid var(--color-border);
    overflow-x: auto;
  }

  .ctx-preview code {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    line-height: 1.5;
    color: var(--color-muted);
    white-space: pre;
  }
</style>
