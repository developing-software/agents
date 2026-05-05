<script lang="ts">
  import Markdown from "$lib/ui/Markdown.svelte";
  import {
    generateClaudeDraft,
    saveAgentConfigFiles,
  } from "$lib/features/agents/api/config.remote";

  type AgentPair = import("@agents/core/agent").AgentDiscovery.AgentPair;
  type ValidationResult = import("@agents/core/agent").AgentDiscovery.ValidationResult;

  let {
    open = $bindable(false),
    pair = null,
    organization,
    repoName,
    ongenerated,
  }: {
    open?: boolean;
    pair: AgentPair | null;
    organization: string;
    repoName: string;
    ongenerated?: () => Promise<void> | void;
  } = $props();

  let instructions = $state("");
  let previewPath = $state<string | null>(null);
  let previewContent = $state("");
  let validation = $state<ValidationResult | null>(null);
  let generating = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let currentKey = $state<string | null>(null);

  function resetState() {
    instructions = "";
    previewPath = null;
    previewContent = "";
    validation = null;
    generating = false;
    saving = false;
    error = null;
    currentKey = null;
  }

  function close() {
    if (generating || saving) return;
    open = false;
    resetState();
  }

  async function handleGenerate() {
    if (!pair || generating) return;
    generating = true;
    error = null;
    try {
      const result = await generateClaudeDraft({
        organization,
        repoName,
        agentsPath: pair.agents.path,
        instructions: instructions.trim() || undefined,
      });
      previewPath = result.path;
      previewContent = result.content;
      validation = result.validation;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to generate CLAUDE.md";
    } finally {
      generating = false;
    }
  }

  async function handleSave() {
    if (!previewPath || saving) return;
    saving = true;
    error = null;
    try {
      await saveAgentConfigFiles({
        organization,
        repoName,
        files: [{ path: previewPath, content: previewContent }],
      });
      await ongenerated?.();
      open = false;
      resetState();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to save CLAUDE.md";
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    const nextKey = open && pair ? pair.agents.path : null;
    if (!nextKey || nextKey === currentKey) return;
    currentKey = nextKey;
    instructions = "";
    previewPath = null;
    previewContent = "";
    validation = null;
    error = null;
  });

  $effect(() => {
    if (!open) {
      resetState();
    }
  });
</script>

{#if open && pair}
  <div class="overlay" onclick={close} aria-hidden="true"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Generate CLAUDE.md">
    <header class="modal-header">
      <div>
        <span class="eyebrow">Generate</span>
        <h3>CLAUDE.md</h3>
        <p>{pair.directory || "/"}</p>
      </div>
      <button type="button" class="close-btn" onclick={close} disabled={generating || saving}>
        x
      </button>
    </header>

    <div class="modal-body">
      <label class="field">
        <span class="field-label">Optional instructions</span>
        <textarea
          bind:value={instructions}
          class="instructions"
          placeholder="Add Claude-specific context, guardrails, or workflow notes"
        ></textarea>
      </label>

      {#if error}
        <div class="message message-error">{error}</div>
      {/if}

      {#if validation}
        <div class="message" class:message-error={!validation.valid}>
          <strong>{validation.valid ? "Valid draft" : "Draft needs changes"}</strong>
          {#if validation.issues.length > 0}
            <ul class="issue-list">
              {#each validation.issues as issue, index (`${validation.path}:${index}`)}
                <li>{issue.message}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}

      {#if previewPath}
        <div class="preview-header">
          <span class="field-label">Preview</span>
          <span class="preview-path">{previewPath}</span>
        </div>
        <div class="preview-grid">
          <div class="preview-pane">
            <span class="pane-label">Rendered</span>
            <div class="preview-markdown">
              <Markdown source={previewContent} />
            </div>
          </div>
          <div class="preview-pane">
            <span class="pane-label">Raw</span>
            <pre class="preview-raw">{previewContent}</pre>
          </div>
        </div>
      {/if}
    </div>

    <footer class="modal-footer">
      <button type="button" class="ghost-btn" onclick={handleGenerate} disabled={generating || saving}>
        {generating ? "Generating..." : "Generate Preview"}
      </button>
      <button type="button" class="primary-btn" onclick={handleSave} disabled={!previewPath || generating || saving}>
        {saving ? "Saving..." : "Save CLAUDE.md"}
      </button>
    </footer>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.56);
    z-index: 100;
  }

  .modal {
    position: fixed;
    inset: 48px;
    z-index: 101;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 1px solid var(--color-border-bright);
    border-radius: 6px;
    overflow: hidden;
  }

  .modal-header,
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-elevated) 82%, transparent);
  }

  .modal-footer {
    border-top: 1px solid var(--color-border);
    border-bottom: none;
    justify-content: flex-end;
  }

  .modal-header h3 {
    margin: 4px 0 0;
    font-size: 16px;
    color: var(--color-text);
  }

  .modal-header p {
    margin: 6px 0 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  .eyebrow,
  .field-label,
  .pane-label,
  .preview-path,
  .ghost-btn,
  .primary-btn {
    font-family: "JetBrains Mono", monospace;
  }

  .eyebrow {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .close-btn,
  .ghost-btn,
  .primary-btn {
    border-radius: 3px;
    cursor: pointer;
  }

  .close-btn {
    border: none;
    background: transparent;
    color: var(--color-dim);
    font-size: 14px;
  }

  .modal-body {
    flex: 1;
    overflow: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-label,
  .pane-label,
  .preview-path,
  .ghost-btn,
  .primary-btn {
    font-size: 11px;
  }

  .field-label,
  .pane-label {
    color: var(--color-muted);
  }

  .instructions,
  .preview-raw {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
    color: var(--color-text);
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
  }

  .instructions {
    min-height: 112px;
    padding: 10px 12px;
    resize: vertical;
  }

  .message {
    padding: 10px 12px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
    font-size: 12px;
  }

  .message-error {
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 24%, transparent);
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  }

  .issue-list {
    margin: 8px 0 0;
    padding-left: 16px;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .preview-path {
    color: var(--color-dim);
  }

  .preview-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }

  .preview-pane {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .preview-markdown,
  .preview-raw {
    min-height: 280px;
  }

  .preview-markdown {
    overflow: auto;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
  }

  .preview-raw {
    margin: 0;
    padding: 12px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .ghost-btn,
  .primary-btn {
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .primary-btn {
    border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
    background: color-mix(in srgb, var(--color-accent) 18%, var(--color-elevated));
    color: var(--color-accent);
  }

  .ghost-btn:disabled,
  .primary-btn:disabled,
  .close-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 980px) {
    .modal {
      inset: 16px;
    }

    .preview-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
