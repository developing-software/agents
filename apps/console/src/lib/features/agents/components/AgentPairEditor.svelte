<script lang="ts">
  import { updateAgentFile } from '$lib/features/agents/api/config.remote';

  let {
    pair,
    agentsFile,
    claudeFile,
    organization,
    repoName,
    onSave,
    onCancel,
  }: {
    pair: { agentsPath: string; claudePath: string; claudeExists: boolean };
    agentsFile: { content: string; sha: string };
    claudeFile: { content: string; sha: string } | null;
    organization: string;
    repoName: string;
    onSave: () => void;
    onCancel: () => void;
  } = $props();

  let agentsContent = $state(agentsFile.content);
  let claudeContent = $state(claudeFile?.content ?? '');
  let saving = $state(false);
  let saveError = $state<string | null>(null);

  const agentsDirty = $derived(agentsContent !== agentsFile.content);
  const claudeDirty = $derived(claudeContent !== (claudeFile?.content ?? ''));
  const hasChanges = $derived(agentsDirty || claudeDirty);

  async function handleSave() {
    if (!hasChanges) return;
    saving = true;
    saveError = null;
    try {
      const ops: Promise<void>[] = [];
      if (agentsDirty) {
        ops.push(
          updateAgentFile({
            organization,
            repoName,
            path: pair.agentsPath,
            content: agentsContent,
            sha: agentsFile.sha,
          }),
        );
      }
      if (claudeDirty && claudeFile) {
        ops.push(
          updateAgentFile({
            organization,
            repoName,
            path: pair.claudePath,
            content: claudeContent,
            sha: claudeFile.sha,
          }),
        );
      }
      await Promise.all(ops);
      onSave();
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }
</script>

<div class="editor-root">
  <div class="editor-panes">
    <div class="pane">
      <div class="pane-header">
        <span class="pane-label">{pair.agentsPath}</span>
        {#if agentsDirty}
          <span class="dirty-dot" title="Unsaved changes"></span>
        {/if}
      </div>
      <textarea
        class="editor-textarea"
        bind:value={agentsContent}
        spellcheck="false"
        aria-label="AGENTS.md content"
      ></textarea>
    </div>

    <div class="pane">
      <div class="pane-header">
        <span class="pane-label">{pair.claudePath}</span>
        {#if claudeDirty}
          <span class="dirty-dot" title="Unsaved changes"></span>
        {/if}
        {#if !pair.claudeExists}
          <span class="new-badge">new</span>
        {/if}
      </div>
      <textarea
        class="editor-textarea"
        bind:value={claudeContent}
        spellcheck="false"
        aria-label="CLAUDE.md content"
        placeholder={pair.claudeExists ? '' : 'File will be created when saved…'}
      ></textarea>
    </div>
  </div>

  {#if saveError}
    <p class="save-error" role="alert">{saveError}</p>
  {/if}

  <div class="editor-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={handleSave}
      disabled={saving || !hasChanges}
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
    <button
      type="button"
      class="btn btn-secondary"
      onclick={onCancel}
      disabled={saving}
    >
      Cancel
    </button>
    {#if hasChanges && !saving}
      <span class="unsaved-hint">Unsaved changes</span>
    {/if}
  </div>
</div>

<style>
  .editor-root {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .editor-panes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .pane {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pane-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pane-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent);
    flex-shrink: 0;
  }

  .new-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-success);
    border: 1px solid var(--color-success);
    border-radius: 3px;
    padding: 0 4px;
    flex-shrink: 0;
  }

  .editor-textarea {
    width: 100%;
    min-height: 260px;
    resize: vertical;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    line-height: 1.6;
    padding: 8px 10px;
    box-sizing: border-box;
    tab-size: 2;
  }

  .editor-textarea:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
  }

  .save-error {
    margin: 0;
    font-size: 11px;
    color: var(--color-danger, #e05c5c);
  }

  .editor-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    border-radius: 4px;
    padding: 5px 12px;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-accent);
    color: var(--color-bg, #fff);
    border-color: var(--color-accent);
  }

  .btn-primary:not(:disabled):hover {
    filter: brightness(1.1);
  }

  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
  }

  .btn-secondary:not(:disabled):hover {
    border-color: var(--color-muted);
  }

  .unsaved-hint {
    font-size: 10px;
    color: var(--color-dim);
    margin-left: 4px;
  }

  @media (max-width: 640px) {
    .editor-panes {
      grid-template-columns: 1fr;
    }
  }
</style>
