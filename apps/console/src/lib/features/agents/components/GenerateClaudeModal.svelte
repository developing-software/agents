<script lang="ts">
  import Drawer from '$lib/ui/Drawer.svelte';
  import Markdown from '$lib/ui/Markdown.svelte';
  import { generateClaudeFile } from '../api/config.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  let {
    ongenerated,
  }: {
    ongenerated?: () => void;
  } = $props();

  const repo = repoContext.get();

  let isOpen = $state(false);
  let directory = $state('');
  let instructions = $state('');
  let preview = $state<string | null>(null);
  let generating = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  export function open(dir: string) {
    directory = dir;
    instructions = '';
    preview = null;
    error = null;
    isOpen = true;
  }

  async function handleGenerate() {
    generating = true;
    error = null;
    try {
      const result = await generateClaudeFile({
        organization: repo.organization,
        repoName: repo.repoName,
        directory,
        instructions: instructions.trim() || undefined,
      });
      preview = result.content;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Generation failed';
    } finally {
      generating = false;
    }
  }

  async function handleConfirm() {
    saving = true;
    error = null;
    try {
      await generateClaudeFile({
        organization: repo.organization,
        repoName: repo.repoName,
        directory,
        instructions: instructions.trim() || undefined,
      });
      isOpen = false;
      ongenerated?.();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }

  function handleClose() {
    isOpen = false;
  }
</script>

<Drawer bind:open={isOpen} title="Generate CLAUDE.md" onclose={handleClose} width="640px">
  <div class="modal-content">
    <div class="field">
      <label class="field-label" for="gen-dir">Directory</label>
      <div class="field-value" id="gen-dir">{directory || '.'}/CLAUDE.md</div>
    </div>

    <div class="field">
      <label class="field-label" for="gen-instructions">Instructions (optional)</label>
      <textarea
        id="gen-instructions"
        class="instructions-input"
        bind:value={instructions}
        placeholder="Add context or instructions to include in the generated file..."
        rows="4"
      ></textarea>
    </div>

    {#if preview}
      <div class="field">
        <span class="field-label">Preview</span>
        <div class="preview-box">
          <Markdown source={preview} />
        </div>
      </div>
    {/if}

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick={handleClose}>Cancel</button>
      {#if preview}
        <button
          type="button"
          class="btn btn-primary"
          disabled={saving}
          onclick={handleConfirm}
        >
          {saving ? 'Saving...' : 'Confirm & Save'}
        </button>
      {:else}
        <button
          type="button"
          class="btn btn-primary"
          disabled={generating}
          onclick={handleGenerate}
        >
          {generating ? 'Generating...' : 'Generate Preview'}
        </button>
      {/if}
    </div>
  </div>
</Drawer>

<style>
  .modal-content {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .field-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    padding: 6px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
  }

  .instructions-input {
    width: 100%;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: 3px;
    padding: 8px 10px;
    outline: none;
    resize: vertical;
    transition: border-color 0.1s;
    line-height: 1.6;
  }
  .instructions-input:focus {
    border-color: var(--color-accent);
  }

  .preview-box {
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-surface);
    max-height: 300px;
    overflow-y: auto;
    font-size: 12px;
  }

  .error-msg {
    font-size: 11px;
    color: var(--color-danger);
    padding: 6px 10px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 4px;
  }

  .btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.1s;
  }

  .btn-secondary {
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
  }
  .btn-secondary:hover { background: var(--color-hover); }

  .btn-primary {
    border: none;
    background: var(--color-accent);
    color: #fff;
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
