<script lang="ts">
  import { updateAgentFile } from "$lib/features/agents/api/config.remote";

  interface Props {
    organization: string;
    repoName: string;
    agentsPath: string;
    claudePath: string;
    agentsContent: string | null;
    agentsSha: string | null;
    claudeContent: string | null;
    claudeSha: string | null;
    isAgentsSymlink: boolean;
    isClaudeSymlink: boolean;
    onclose: () => void;
    onsaved?: () => void;
  }

  let {
    organization,
    repoName,
    agentsPath,
    claudePath,
    agentsContent,
    agentsSha,
    claudeContent,
    claudeSha,
    isAgentsSymlink,
    isClaudeSymlink,
    onclose,
    onsaved,
  }: Props = $props();

  let agentsDraft = $state(agentsContent ?? "");
  let claudeDraft = $state(claudeContent ?? "");

  let agentsSaving = $state(false);
  let claudeSaving = $state(false);
  let agentsError = $state<string | null>(null);
  let claudeError = $state<string | null>(null);
  let agentsSaved = $state(false);
  let claudeSaved = $state(false);

  const agentsDirty = $derived(agentsDraft !== (agentsContent ?? ""));
  const claudeDirty = $derived(claudeDraft !== (claudeContent ?? ""));

  async function saveAgents() {
    agentsSaving = true;
    agentsError = null;
    agentsSaved = false;
    try {
      await updateAgentFile({
        organization,
        repoName,
        path: agentsPath,
        content: agentsDraft,
        sha: agentsSha ?? undefined,
      });
      agentsSaved = true;
      onsaved?.();
    } catch (e) {
      agentsError = e instanceof Error ? e.message : "Save failed";
    } finally {
      agentsSaving = false;
    }
  }

  async function saveClaude() {
    claudeSaving = true;
    claudeError = null;
    claudeSaved = false;
    try {
      await updateAgentFile({
        organization,
        repoName,
        path: claudePath,
        content: claudeDraft,
        sha: claudeSha ?? undefined,
      });
      claudeSaved = true;
      onsaved?.();
    } catch (e) {
      claudeError = e instanceof Error ? e.message : "Save failed";
    } finally {
      claudeSaving = false;
    }
  }
</script>

<div class="editor-overlay" role="dialog" aria-modal="true" aria-label="Edit agent pair">
  <div class="editor-panel">
    <div class="editor-header">
      <span class="editor-title">Edit Agent Pair</span>
      <button class="close-btn" onclick={onclose} aria-label="Close editor">✕</button>
    </div>

    <div class="panes">
      <!-- AGENTS.md pane -->
      <div class="pane">
        <div class="pane-header">
          <span class="pane-label">
            {agentsPath}
            {#if isAgentsSymlink}<span class="symlink-badge" title="This file is a symlink">⌘ symlink</span>{/if}
          </span>
          <div class="pane-actions">
            {#if agentsSaved}<span class="saved-indicator">Saved</span>{/if}
            {#if agentsError}<span class="error-indicator" title={agentsError}>Error</span>{/if}
            <button
              class="save-btn"
              onclick={saveAgents}
              disabled={agentsSaving || !agentsDirty || isAgentsSymlink}
              title={isAgentsSymlink ? "Cannot edit a symlink" : undefined}
            >
              {agentsSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <textarea
          class="editor-textarea"
          bind:value={agentsDraft}
          disabled={isAgentsSymlink}
          spellcheck="false"
          aria-label="AGENTS.md content"
        ></textarea>
      </div>

      <!-- CLAUDE.md pane -->
      <div class="pane">
        <div class="pane-header">
          <span class="pane-label">
            {claudePath}
            {#if isClaudeSymlink}<span class="symlink-badge" title="This file is a symlink">⌘ symlink</span>{/if}
          </span>
          <div class="pane-actions">
            {#if claudeSaved}<span class="saved-indicator">Saved</span>{/if}
            {#if claudeError}<span class="error-indicator" title={claudeError}>Error</span>{/if}
            <button
              class="save-btn"
              onclick={saveClaude}
              disabled={claudeSaving || !claudeDirty || isClaudeSymlink}
              title={isClaudeSymlink ? "Cannot edit a symlink" : undefined}
            >
              {claudeSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        {#if claudeContent === null && !isClaudeSymlink}
          <p class="empty-hint">CLAUDE.md does not exist yet. Start typing to create it.</p>
        {/if}
        <textarea
          class="editor-textarea"
          bind:value={claudeDraft}
          disabled={isClaudeSymlink}
          spellcheck="false"
          aria-label="CLAUDE.md content"
        ></textarea>
      </div>
    </div>
  </div>
</div>

<style>
  .editor-overlay {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-bg) 85%, transparent);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 20px;
    z-index: 100;
    backdrop-filter: blur(2px);
  }

  .editor-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    width: 100%;
    max-width: 1100px;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 80px);
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .editor-title {
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

  .panes {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  .pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-right: 1px solid var(--color-border);
  }

  .pane:last-child {
    border-right: none;
  }

  .pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
    flex-shrink: 0;
    gap: 8px;
  }

  .pane-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .symlink-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    background: color-mix(in srgb, var(--color-dim) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-dim) 20%, transparent);
    border-radius: 3px;
    padding: 1px 4px;
    margin-left: 6px;
  }

  .pane-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .save-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 10px;
    border-radius: 3px;
    border: 1px solid var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
    cursor: pointer;
  }

  .save-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .save-btn:not(:disabled):hover {
    background: color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  .saved-indicator {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-success);
  }

  .error-indicator {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-error, #e55);
    cursor: help;
  }

  .empty-hint {
    font-size: 11px;
    color: var(--color-dim);
    margin: 0;
    padding: 6px 12px;
    background: color-mix(in srgb, var(--color-warning, #aa7) 8%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-warning, #aa7) 20%, transparent);
    flex-shrink: 0;
  }

  .editor-textarea {
    flex: 1;
    resize: none;
    border: none;
    outline: none;
    padding: 12px;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
    background: var(--color-surface);
    color: var(--color-text);
    min-height: 400px;
  }

  .editor-textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
