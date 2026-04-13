<script lang="ts">
  import { tick } from 'svelte';
  import { TextareaAutosize } from 'runed';
  import Markdown from '$lib/ui/Markdown.svelte';

  let {
    path,
    value,
    savedValue,
    saving = false,
    error = null,
    referencedPath = null,
    handleChange,
    handleSave,
    handleDiscard,
  }: {
    path: string;
    value: string;
    savedValue: string;
    saving?: boolean;
    error?: string | null;
    referencedPath?: string | null;
    handleChange?: (value: string) => void;
    handleSave?: () => void;
    handleDiscard?: () => void;
  } = $props();

  let mode = $state<'preview' | 'edit'>('preview');
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  new TextareaAutosize({
    element: () => textareaEl,
    input: () => value,
    maxHeight: 800,
  });

  const isDirty = $derived(value !== savedValue);

  const referenceLine = $derived.by(() => {
    if (!referencedPath) return null;
    const lines = value.split('\n');
    const idx = lines.findIndex((line) => line.includes(referencedPath));
    return idx === -1 ? null : idx + 1;
  });

  async function toggleMode(next: 'preview' | 'edit') {
    mode = next;
    if (next === 'edit') {
      await tick();
      textareaEl?.focus();
    }
  }

  function jumpToReference() {
    if (!textareaEl || !referencedPath) return;

    const index = value.indexOf(referencedPath);
    if (index < 0) return;

    mode = 'edit';
    tick().then(() => {
      if (!textareaEl) return;
      textareaEl.focus();
      textareaEl.setSelectionRange(index, index + referencedPath.length);
    });
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
    if (!isDirty || saving) return;
    event.preventDefault();
    handleSave?.();
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="editor-shell">
  <header class="editor-header">
    <div class="title-wrap">
      <div class="title">{path}</div>
      {#if isDirty}
        <span class="dirty-label">Unsaved</span>
      {/if}
    </div>

    <div class="actions">
      <button type="button" class="mode-btn" class:mode-active={mode === 'preview'} onclick={() => toggleMode('preview')}>Preview</button>
      <button type="button" class="mode-btn" class:mode-active={mode === 'edit'} onclick={() => toggleMode('edit')}>Edit</button>
      <button type="button" class="btn" disabled={!isDirty || saving} onclick={() => handleDiscard?.()}>Discard</button>
      <button type="button" class="btn btn-primary" disabled={!isDirty || saving} onclick={() => handleSave?.()}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if referenceLine}
    <div class="reference">
      <span>Reference found at line {referenceLine}</span>
      <button type="button" class="jump-btn" onclick={jumpToReference}>Jump</button>
    </div>
  {/if}

  {#if mode === 'preview'}
    <div class="preview">
      <Markdown source={value} />
    </div>
  {:else}
    <textarea
      bind:this={textareaEl}
      class="editor"
      value={value}
      oninput={(event) => handleChange?.(event.currentTarget.value)}
      spellcheck="false"
      placeholder="Write AGENTS.md instructions..."
    ></textarea>
  {/if}
</div>

<style>
  .editor-shell {
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-elevated);
    padding: 8px 10px;
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dirty-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-warning);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .mode-btn,
  .btn,
  .jump-btn {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-muted);
    border-radius: 4px;
    padding: 4px 9px;
    cursor: pointer;
  }

  .mode-btn:hover,
  .btn:hover,
  .jump-btn:hover {
    color: var(--color-text);
  }

  .mode-active {
    color: var(--color-text);
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface));
  }

  .btn-primary {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  .btn:disabled,
  .btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .error {
    font-size: 12px;
    color: var(--color-danger);
    border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent);
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
    border-radius: 6px;
    padding: 8px 10px;
  }

  .reference {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--color-dim);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 6px;
    padding: 6px 10px;
  }

  .preview {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    padding: 14px;
  }

  .editor {
    flex: 1;
    min-height: 300px;
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-text);
    padding: 12px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    resize: none;
    outline: none;
  }

  .editor:focus {
    border-color: var(--color-accent);
  }
</style>
