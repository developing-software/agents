<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import type { AgentDiscovery } from '@agents/core/agent';
  import Drawer from '$lib/ui/Drawer.svelte';
  import MarkdownEditor from '$lib/ui/MarkdownEditor.svelte';
  import { generateClaudeDraft, saveConfigPair } from '../api/config.remote';
  import { formatDirectoryLabel, validateConfigContent } from './helpers';

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  let isOpen = $state(false);
  let currentPair = $state<AgentDiscovery.ConfigPair | null>(null);
  let instructions = $state('');
  let preview = $state('');
  let generating = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let generatedOnce = $state(false);

  const previewErrors = $derived(preview.trim() ? validateConfigContent(preview) : []);
  const dirty = $derived(!!instructions.trim() || !!preview.trim());

  export function open(pair: AgentDiscovery.ConfigPair) {
    currentPair = pair;
    instructions = '';
    preview = '';
    generating = false;
    saving = false;
    error = null;
    generatedOnce = false;
    isOpen = true;
  }

  function reset() {
    isOpen = false;
    currentPair = null;
    instructions = '';
    preview = '';
    generating = false;
    saving = false;
    error = null;
    generatedOnce = false;
  }

  function canClose(): boolean {
    return !dirty || confirm('Discard this generated CLAUDE.md draft?');
  }

  async function handleGenerate() {
    if (!currentPair) return;
    generating = true;
    error = null;

    try {
      const result = await generateClaudeDraft({
        organization,
        repoName,
        directory: currentPair.directory,
        instructions,
      });
      preview = result.content;
      generatedOnce = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate CLAUDE.md';
    } finally {
      generating = false;
    }
  }

  async function handleSave() {
    if (!currentPair || !preview.trim() || previewErrors.length > 0) return;
    saving = true;
    error = null;

    try {
      await saveConfigPair({
        organization,
        repoName,
        directory: currentPair.directory,
        files: [{ name: 'CLAUDE.md', content: preview }],
      });
      await invalidateAll();
      reset();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save CLAUDE.md';
    } finally {
      saving = false;
    }
  }
</script>

<Drawer bind:open={isOpen} title="Generate CLAUDE.md" width="920px" canclose={canClose} onclose={reset}>
  <div class="modal-shell">
    {#if currentPair}
      <div class="intro">
        <div class="intro-title">Template-driven draft</div>
        <div class="intro-copy">
          Create a missing <span class="mono">CLAUDE.md</span> for <span class="mono">{formatDirectoryLabel(currentPair.directory)}</span>.
        </div>
      </div>

      <div class="field">
        <label class="label" for="claude-context">Additional context</label>
        <textarea
          id="claude-context"
          bind:value={instructions}
          rows="5"
          placeholder="Optional Claude-specific instructions or constraints"
        ></textarea>
      </div>

      <div class="actions">
        <button type="button" class="secondary-btn" disabled={generating || saving} onclick={handleGenerate}>
          {generating ? 'Generating...' : generatedOnce ? 'Regenerate Draft' : 'Generate Draft'}
        </button>
        <button
          type="button"
          class="primary-btn"
          disabled={!preview.trim() || previewErrors.length > 0 || saving}
          onclick={handleSave}
        >
          {saving ? 'Saving...' : 'Save CLAUDE.md'}
        </button>
      </div>

      {#if error}
        <div class="error-banner">{error}</div>
      {/if}

      {#if preview}
        <div class="preview-block">
          <div class="preview-header">
            <span class="preview-title">Preview</span>
            <span class="preview-path mono">{currentPair.directory ? `${currentPair.directory}/CLAUDE.md` : 'CLAUDE.md'}</span>
          </div>

          <MarkdownEditor bind:value={preview} minHeight="360px" placeholder="Generated CLAUDE.md preview" />

          {#if previewErrors.length > 0}
            <div class="validation-list">
              {#each previewErrors as message (message)}
                <div class="validation-error">{message}</div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</Drawer>

<style>
  .modal-shell {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .intro {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .intro-title {
    font-size: 13px;
    color: var(--color-text);
  }

  .intro-copy {
    font-size: 12px;
    color: var(--color-dim);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label,
  .preview-title {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-muted);
  }

  textarea {
    min-height: 120px;
    resize: vertical;
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .primary-btn,
  .secondary-btn {
    border-radius: 4px;
    padding: 6px 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
  }

  .primary-btn {
    border: 1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .secondary-btn {
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .primary-btn:disabled,
  .secondary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-banner,
  .validation-error {
    color: var(--color-danger);
    border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent);
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .preview-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: baseline;
  }

  .preview-path {
    font-size: 10px;
    color: var(--color-dim);
  }

  .validation-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  @media (max-width: 700px) {
    .preview-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
