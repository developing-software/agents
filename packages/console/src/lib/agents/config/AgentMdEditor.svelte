<script lang="ts">
  import Markdown from '$lib/ui/Markdown.svelte';
  import type { EditorMode } from './config-types';

  let {
    content = $bindable(),
    path,
    dirty,
    saving,
    onsave,
    ondiscard,
  }: {
    content: string;
    path: string;
    dirty: boolean;
    saving: boolean;
    onsave: () => void;
    ondiscard: () => void;
  } = $props();

  let mode = $state<EditorMode>('preview');
  let textareaEl = $state<HTMLTextAreaElement>();

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (dirty && !saving) onsave();
    }
  }

  function switchToEdit() {
    mode = 'edit';
  }

  function switchToPreview() {
    mode = 'preview';
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor-container">
  <div class="editor-toolbar">
    <div class="toolbar-left">
      <span class="file-path">{path}</span>
      {#if dirty}
        <span class="dirty-dot" title="Unsaved changes"></span>
      {/if}
    </div>
    <div class="toolbar-right">
      <div class="mode-toggle">
        <button
          type="button"
          class="mode-btn"
          class:mode-active={mode === 'preview'}
          onclick={switchToPreview}
        >Preview</button>
        <button
          type="button"
          class="mode-btn"
          class:mode-active={mode === 'edit'}
          onclick={switchToEdit}
        >Edit</button>
      </div>
      {#if dirty}
        <button type="button" class="action-btn discard-btn" onclick={ondiscard} disabled={saving}>
          Discard
        </button>
        <button type="button" class="action-btn save-btn" onclick={onsave} disabled={saving}>
          {#if saving}Saving...{:else}Save{/if}
        </button>
      {/if}
    </div>
  </div>

  <div class="editor-body">
    {#if mode === 'edit'}
      <textarea
        bind:this={textareaEl}
        bind:value={content}
        class="edit-textarea"
        spellcheck="false"
      ></textarea>
    {:else}
      <div class="preview-pane">
        {#if content.trim()}
          <Markdown source={content} />
        {:else}
          <p class="empty-hint">This file is empty. Switch to Edit mode to add content.</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px 4px 0 0;
    flex-shrink: 0;
    gap: 8px;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .file-path {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-warning);
    flex-shrink: 0;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .mode-toggle {
    display: flex;
    gap: 1px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 1px;
  }

  .mode-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 2px;
    border: none;
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
  }
  .mode-btn:hover { color: var(--color-muted); }
  .mode-active { background: var(--color-hover); color: var(--color-text); }

  .action-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 10px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: all 0.1s;
  }
  .action-btn:disabled { opacity: 0.5; cursor: default; }

  .discard-btn {
    background: none;
    color: var(--color-muted);
  }
  .discard-btn:hover:not(:disabled) {
    color: var(--color-text);
    border-color: var(--color-border-bright);
  }

  .save-btn {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
  }
  .save-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  .editor-body {
    flex: 1;
    min-height: 0;
    border: 1px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 4px 4px;
    overflow: hidden;
  }

  .edit-textarea {
    width: 100%;
    height: 100%;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
    background: var(--color-bg);
    color: var(--color-text);
    border: none;
    padding: 12px 14px;
    outline: none;
    resize: none;
    tab-size: 2;
  }

  .preview-pane {
    padding: 14px 16px;
    background: var(--color-surface);
    height: 100%;
    overflow-y: auto;
  }

  .empty-hint {
    font-size: 12px;
    color: var(--color-dim);
    font-style: italic;
  }
</style>
