<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { AgentDiscovery } from '@agents/core/agent';
  import { createClaudeFile, generateClaudePreview } from '$lib/features/agents/api/config.remote';
  import Markdown from '$lib/ui/Markdown.svelte';

  interface Props {
    open: boolean;
    pair: AgentDiscovery.ConfigPair | null;
    organization: string;
    repoName: string;
  }

  let { open = $bindable(false), pair = null, organization, repoName }: Props = $props();

  let instructions = $state('');
  let generatedPath = $state('');
  let generatedContent = $state('');
  let generating = $state(false);
  let saving = $state(false);
  let errorMessage = $state('');
  let showPreview = $state<'rendered' | 'source'>('rendered');

  $effect(() => {
    if (!open) {
      instructions = '';
      generatedPath = '';
      generatedContent = '';
      errorMessage = '';
      showPreview = 'rendered';
    }
  });

  function close() {
    open = false;
  }

  async function preview() {
    if (!pair) return;
    generating = true;
    errorMessage = '';

    try {
      const result = await generateClaudePreview({
        organization,
        repoName,
        agentsPath: pair.agents.path,
        instructions,
      });
      generatedPath = result.path;
      generatedContent = result.content;
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : 'Failed to generate CLAUDE.md';
    } finally {
      generating = false;
    }
  }

  async function save() {
    if (!pair || !generatedContent || saving) return;
    saving = true;
    errorMessage = '';

    try {
      await createClaudeFile({
        organization,
        repoName,
        agentsPath: pair.agents.path,
        content: generatedContent,
      });
      await invalidateAll();
      close();
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : 'Failed to save CLAUDE.md';
    } finally {
      saving = false;
    }
  }
</script>

{#if open}
  <button type="button" class="overlay" aria-label="Close generate dialog" onclick={close}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Generate CLAUDE.md">
    <header class="header">
      <div>
        <h3>Generate CLAUDE.md</h3>
        {#if pair}
          <p>{pair.agents.path}</p>
        {/if}
      </div>
      <button type="button" class="ghost" onclick={close}>Close</button>
    </header>

    {#if errorMessage}
      <div class="banner error">{errorMessage}</div>
    {/if}

    <div class="body">
      <label class="field">
        <span>Optional context</span>
        <textarea bind:value={instructions} spellcheck="false" placeholder="Add Claude-specific context or constraints"></textarea>
      </label>

      <div class="actions">
        <button type="button" class="primary" onclick={preview} disabled={generating || saving}>
          {generating ? 'Generating...' : 'Generate Preview'}
        </button>
        <button type="button" class="ghost" onclick={() => (showPreview = 'rendered')} disabled={!generatedContent}>Rendered</button>
        <button type="button" class="ghost" onclick={() => (showPreview = 'source')} disabled={!generatedContent}>Source</button>
      </div>

      {#if generatedContent}
        <section class="preview-shell">
          <div class="preview-header">
            <span>Preview</span>
            <code>{generatedPath}</code>
          </div>
          {#if showPreview === 'rendered'}
            <div class="preview"><Markdown source={generatedContent} /></div>
          {:else}
            <textarea class="source" bind:value={generatedContent} spellcheck="false"></textarea>
          {/if}
        </section>
      {/if}
    </div>

    <footer class="footer">
      <button type="button" class="ghost" onclick={close}>Discard</button>
      <button type="button" class="primary" onclick={save} disabled={!generatedContent || generating || saving}>
        {saving ? 'Saving...' : 'Save CLAUDE.md'}
      </button>
    </footer>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 55%);
    z-index: 110;
    border: none;
    padding: 0;
    cursor: default;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(880px, calc(100vw - 24px));
    max-height: calc(100vh - 24px);
    z-index: 111;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .header,
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--color-border);
  }

  .footer {
    border-bottom: none;
    border-top: 1px solid var(--color-border);
  }

  h3 {
    margin: 0;
    font-size: 13px;
    color: var(--color-text);
  }

  .header p {
    margin: 4px 0 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    overflow: auto;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field span,
  .preview-header span {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  textarea {
    width: 100%;
    min-height: 112px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
    padding: 10px 12px;
    outline: none;
    resize: vertical;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--color-text);
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ghost,
  .primary {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    padding: 5px 10px;
    background: var(--color-elevated);
    color: var(--color-text);
    cursor: pointer;
  }

  .primary {
    background: color-mix(in srgb, var(--color-accent) 16%, transparent);
    border-color: color-mix(in srgb, var(--color-accent) 32%, var(--color-border));
    color: var(--color-accent);
  }

  .ghost:disabled,
  .primary:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .banner {
    padding: 8px 14px;
    border-bottom: 1px solid var(--color-border);
    font-size: 11px;
  }

  .banner.error {
    background: var(--color-danger-dim);
    color: var(--color-danger);
  }

  .preview-shell {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  .preview {
    padding: 12px;
    background: var(--color-surface);
    min-height: 220px;
  }

  .source {
    min-height: 320px;
    border: none;
    border-radius: 0;
  }

  @media (max-width: 720px) {
    .modal {
      width: calc(100vw - 12px);
      max-height: calc(100vh - 12px);
    }

    .header,
    .footer {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
