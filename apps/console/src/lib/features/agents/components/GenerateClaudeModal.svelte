<script lang="ts">
  import { generateClaudeFile } from '../api/config.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  let {
    agentsPath,
    onclose,
    ongenerated,
  }: {
    agentsPath: string;
    onclose?: () => void;
    ongenerated?: (claudePath: string) => void;
  } = $props();

  const repo = repoContext.get();

  let instructions = $state('');
  let preview = $state<string | null>(null);
  let generating = $state(false);
  let confirming = $state(false);
  let error = $state<string | null>(null);
  let claudePath = $state('');

  async function generate() {
    generating = true;
    error = null;
    try {
      const result = await generateClaudeFile({
        organization: repo.organization,
        repoName: repo.repoName,
        agentsPath,
        instructions: instructions.trim() || undefined,
        mode: 'pr',
      });
      preview = result.content;
      claudePath = result.claudePath;
      confirming = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Generation failed';
    } finally {
      generating = false;
    }
  }

  function discard() {
    preview = null;
    confirming = false;
  }

  function confirm() {
    if (claudePath) {
      ongenerated?.(claudePath);
    }
    onclose?.();
  }
</script>

<div
  class="modal-backdrop"
  role="button"
  tabindex="-1"
  onclick={() => onclose?.()}
  onkeydown={(e) => { if (e.key === 'Escape') onclose?.(); }}
>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <div class="modal-header">
      <span class="modal-title">Generate CLAUDE.md</span>
      <button class="btn-close" onclick={() => onclose?.()}>✕</button>
    </div>

    <div class="modal-body">
      <p class="path-hint">Target: <code>{claudePath || (agentsPath.includes('/') ? agentsPath.slice(0, agentsPath.lastIndexOf('/')) + '/CLAUDE.md' : 'CLAUDE.md')}</code></p>

      {#if !confirming}
        <div class="field">
          <label class="field-label" for="instructions">Optional context or instructions</label>
          <textarea
            id="instructions"
            class="field-textarea"
            bind:value={instructions}
            placeholder="e.g. Focus on TypeScript patterns, mention the testing setup, reference the README…"
            rows={4}
          ></textarea>
        </div>

        {#if error}
          <div class="error-msg">{error}</div>
        {/if}

        <div class="modal-actions">
          <button class="btn-secondary" onclick={() => onclose?.()}>Cancel</button>
          <button class="btn-primary" onclick={generate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      {:else}
        <div class="preview-section">
          <div class="preview-label">Preview</div>
          <pre class="preview-content">{preview}</pre>
        </div>

        {#if error}
          <div class="error-msg">{error}</div>
        {/if}

        <div class="modal-actions">
          <button class="btn-secondary" onclick={discard}>Back</button>
          <button class="btn-primary" onclick={confirm}>Confirm &amp; Create PR</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    width: 520px;
    max-width: 95vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
  }

  .modal-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text);
  }

  .btn-close {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 2px 7px;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-dim);
    cursor: pointer;
    line-height: 1.4;
  }
  .btn-close:hover { color: var(--color-text); }

  .modal-body {
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .path-hint {
    font-size: 11px;
    color: var(--color-dim);
    margin: 0;
  }

  .path-hint code {
    font-family: "JetBrains Mono", monospace;
    color: var(--color-muted);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .field-textarea {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: 3px;
    padding: 8px 10px;
    resize: vertical;
    outline: none;
    line-height: 1.5;
  }
  .field-textarea:focus { border-color: var(--color-accent); }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preview-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .preview-content {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 10px 12px;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--color-text);
    max-height: 300px;
    overflow-y: auto;
    line-height: 1.5;
    margin: 0;
  }

  .error-msg {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-error, #e05260);
    background: color-mix(in srgb, var(--color-error, #e05260) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error, #e05260) 30%, transparent);
    border-radius: 3px;
    padding: 6px 10px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn-primary {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 5px 14px;
    background: var(--color-accent);
    color: #fff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-primary:not(:disabled):hover { opacity: 0.85; }

  .btn-secondary {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 14px;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    border-radius: 3px;
    cursor: pointer;
  }
  .btn-secondary:hover { border-color: var(--color-muted); color: var(--color-text); }
</style>
