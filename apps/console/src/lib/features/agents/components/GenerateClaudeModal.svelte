<script lang="ts">
  import Drawer from '$lib/ui/Drawer.svelte';
  import { generateClaudeFile } from '../api/config.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  let {
    ongenerated,
  }: {
    ongenerated?: () => void;
  } = $props();

  const repo = repoContext.get();

  let isOpen = $state(false);
  let directory = $state('.');
  let instructions = $state('');
  let generating = $state(false);
  let error = $state<string | null>(null);
  let preview = $state<{ path: string; content: string } | null>(null);

  export function open(dir: string) {
    directory = dir;
    instructions = '';
    error = null;
    preview = null;
    generating = false;
    isOpen = true;
  }

  function close() {
    isOpen = false;
  }

  async function generate() {
    generating = true;
    error = null;
    try {
      const result = await generateClaudeFile({
        organization: repo.organization,
        repoName: repo.repoName,
        directory,
        instructions: instructions.trim() || undefined,
      });
      preview = result;
      ongenerated?.();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Generation failed';
    } finally {
      generating = false;
    }
  }
</script>

<Drawer bind:open={isOpen} title="Generate CLAUDE.md" width="560px" onclose={close}>
  <div class="modal-content">
    {#if preview}
      <div class="preview-section">
        <div class="preview-header">
          <span class="preview-label">Created</span>
          <span class="preview-path">{preview.path}</span>
        </div>
        <pre class="preview-content">{preview.content}</pre>
        <button type="button" class="btn btn-secondary" onclick={close}>Done</button>
      </div>
    {:else}
      <div class="form-section">
        <label class="field-label" for="gen-dir">Directory</label>
        <input id="gen-dir" type="text" class="field-input" value={directory} disabled />
      </div>

      <div class="form-section">
        <label class="field-label" for="gen-instructions">Instructions (optional)</label>
        <textarea
          id="gen-instructions"
          class="field-textarea"
          placeholder="Add context or specific instructions for this CLAUDE.md..."
          rows="6"
          bind:value={instructions}
        ></textarea>
        <p class="field-hint">Leave blank to derive content from the paired AGENTS.md, if one exists.</p>
      </div>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <div class="actions">
        <button type="button" class="btn btn-secondary" onclick={close}>Cancel</button>
        <button type="button" class="btn btn-primary" onclick={generate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    {/if}
  </div>
</Drawer>

<style>
  .modal-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
  }

  .field-input {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    padding: 6px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .field-input:disabled {
    opacity: 0.6;
  }

  .field-textarea {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    resize: vertical;
    line-height: 1.5;
  }

  .field-hint {
    font-size: 11px;
    color: var(--color-dim);
    margin: 0;
  }

  .error-msg {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-error, #e55);
    padding: 6px 8px;
    border: 1px solid var(--color-error, #e55);
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-error, #e55) 8%, transparent);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 4px;
  }

  .btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    cursor: pointer;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-bg);
  }

  .btn-primary {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-success);
  }

  .preview-path {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .preview-content {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    line-height: 1.5;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
  }
</style>
