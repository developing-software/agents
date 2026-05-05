<script lang="ts">
  import { generateClaudeFile } from "$lib/features/agents/api/config.remote";

  interface Props {
    organization: string;
    repoName: string;
    agentsPath: string;
    claudePath: string;
    onclose: () => void;
    ongenerated?: () => void;
  }

  let { organization, repoName, agentsPath, claudePath, onclose, ongenerated }: Props = $props();

  let instructions = $state("");
  let preview = $state<string | null>(null);
  let generating = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let step = $state<"form" | "preview">("form");

  async function generate() {
    generating = true;
    error = null;
    try {
      const result = await generateClaudeFile({
        organization,
        repoName,
        agentsPath,
        claudePath,
        instructions: instructions.trim() || undefined,
        branch: undefined,
      });
      preview = result.content;
      step = "preview";
    } catch (e) {
      error = e instanceof Error ? e.message : "Generation failed";
    } finally {
      generating = false;
    }
  }

  async function confirm() {
    if (!preview) return;
    saving = true;
    error = null;
    try {
      await generateClaudeFile({
        organization,
        repoName,
        agentsPath,
        claudePath,
        instructions: instructions.trim() || undefined,
      });
      ongenerated?.();
      onclose();
    } catch (e) {
      error = e instanceof Error ? e.message : "Save failed";
    } finally {
      saving = false;
    }
  }

  function back() {
    step = "form";
    preview = null;
    error = null;
  }
</script>

<div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Generate CLAUDE.md">
  <div class="modal-panel">
    <div class="modal-header">
      <span class="modal-title">Generate {claudePath}</span>
      <button class="close-btn" onclick={onclose} aria-label="Close">✕</button>
    </div>

    {#if step === "form"}
      <div class="modal-body">
        <p class="modal-desc">
          Generate a <code>CLAUDE.md</code> file from the existing <code>{agentsPath}</code>
          content. You can provide optional instructions to customize the output.
        </p>

        <label class="field-label" for="instructions">Additional instructions (optional)</label>
        <textarea
          id="instructions"
          class="instructions-input"
          bind:value={instructions}
          placeholder="e.g. Focus on TypeScript conventions and testing requirements…"
          rows="4"
        ></textarea>

        {#if error}
          <p class="error-msg">{error}</p>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={onclose}>Cancel</button>
        <button class="btn-primary" onclick={generate} disabled={generating}>
          {generating ? "Generating…" : "Preview"}
        </button>
      </div>
    {:else if step === "preview"}
      <div class="modal-body">
        <p class="modal-desc preview-label">Preview — review before saving</p>
        <pre class="preview-content">{preview}</pre>
        {#if error}
          <p class="error-msg">{error}</p>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={back}>Back</button>
        <button class="btn-primary" onclick={confirm} disabled={saving}>
          {saving ? "Saving…" : "Confirm & Save"}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-bg) 85%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
    backdrop-filter: blur(2px);
  }

  .modal-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 80px);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .modal-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text);
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-dim);
    padding: 2px 6px;
    border-radius: 3px;
  }

  .close-btn:hover {
    color: var(--color-text);
    background: var(--color-elevated);
  }

  .modal-body {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .modal-desc {
    font-size: 12px;
    color: var(--color-muted);
    margin: 0 0 14px;
    line-height: 1.5;
  }

  .modal-desc code {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 1px 4px;
  }

  .preview-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
  }

  .field-label {
    display: block;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }

  .instructions-input {
    width: 100%;
    box-sizing: border-box;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.5;
    padding: 8px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    resize: vertical;
    outline: none;
  }

  .instructions-input:focus {
    border-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-border));
  }

  .preview-content {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    line-height: 1.6;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--color-text);
    margin: 0;
  }

  .error-msg {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-error, #e55);
    margin: 10px 0 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .btn-secondary {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
  }

  .btn-secondary:hover {
    color: var(--color-text);
    border-color: color-mix(in srgb, var(--color-text) 30%, var(--color-border));
  }

  .btn-primary {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 4px;
    border: 1px solid var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
    color: var(--color-accent);
    cursor: pointer;
  }

  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-primary:not(:disabled):hover {
    background: color-mix(in srgb, var(--color-accent) 30%, transparent);
  }
</style>
