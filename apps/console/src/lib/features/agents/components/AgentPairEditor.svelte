<script lang="ts">
  import MarkdownEditor from '$lib/ui/MarkdownEditor.svelte';
  import { getAgentPair, updateAgentFile } from '../api/config.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  let {
    agentsPath,
    onclose,
    onsaved,
  }: {
    agentsPath: string;
    onclose?: () => void;
    onsaved?: () => void;
  } = $props();

  const repo = repoContext.get();

  type FileContent = {
    agentsPath: string;
    claudePath: string;
    agentsContent: string | null;
    claudeContent: string | null;
  };

  let data = $state<FileContent | null>(null);
  let loading = $state(true);
  let loadError = $state<string | null>(null);

  let agentsValue = $state('');
  let claudeValue = $state('');
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let dirty = $state(false);

  $effect(() => {
    loading = true;
    loadError = null;
    getAgentPair({ organization: repo.organization, repoName: repo.repoName, agentsPath })
      .then((result) => {
        data = result;
        agentsValue = result.agentsContent ?? '';
        claudeValue = result.claudeContent ?? '';
        dirty = false;
        loading = false;
      })
      .catch((err) => {
        loadError = err instanceof Error ? err.message : 'Failed to load files';
        loading = false;
      });
  });

  $effect(() => {
    if (data) {
      dirty = agentsValue !== (data.agentsContent ?? '') || claudeValue !== (data.claudeContent ?? '');
    }
  });

  async function save() {
    if (!data || saving) return;
    saving = true;
    saveError = null;

    try {
      const updates: Promise<unknown>[] = [];

      if (agentsValue !== (data.agentsContent ?? '')) {
        updates.push(
          updateAgentFile({
            organization: repo.organization,
            repoName: repo.repoName,
            path: data.agentsPath,
            content: agentsValue,
            mode: 'pr',
          }),
        );
      }

      if (claudeValue !== (data.claudeContent ?? '')) {
        updates.push(
          updateAgentFile({
            organization: repo.organization,
            repoName: repo.repoName,
            path: data.claudePath,
            content: claudeValue,
            mode: 'pr',
          }),
        );
      }

      await Promise.all(updates);
      dirty = false;
      onsaved?.();
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  function tryClose() {
    if (dirty) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    onclose?.();
  }
</script>

<div class="editor-shell">
  <div class="editor-header">
    <span class="editor-title">Edit: {agentsPath}</span>
    <div class="header-actions">
      {#if dirty}
        <button class="btn-save" onclick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save as PR'}
        </button>
      {/if}
      <button class="btn-close" onclick={tryClose}>✕</button>
    </div>
  </div>

  {#if saveError}
    <div class="error-banner">{saveError}</div>
  {/if}

  {#if loading}
    <div class="loader">Loading…</div>
  {:else if loadError}
    <div class="error-banner">{loadError}</div>
  {:else if data}
    <div class="split-pane">
      <div class="pane">
        <div class="pane-label">AGENTS.md</div>
        <MarkdownEditor bind:value={agentsValue} placeholder="Agent instructions…" minHeight="320px" />
      </div>
      <div class="pane-divider"></div>
      <div class="pane">
        <div class="pane-label">CLAUDE.md</div>
        <MarkdownEditor bind:value={claudeValue} placeholder="Claude-specific instructions…" minHeight="320px" />
      </div>
    </div>
  {/if}
</div>

<style>
  .editor-shell {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 0;
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
  }

  .editor-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .btn-save {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 10px;
    background: var(--color-accent);
    color: #fff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
  .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-save:not(:disabled):hover { opacity: 0.85; }

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
  .btn-close:hover { color: var(--color-text); border-color: var(--color-muted); }

  .error-banner {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-error, #e05260);
    background: color-mix(in srgb, var(--color-error, #e05260) 10%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-error, #e05260) 30%, transparent);
    padding: 8px 14px;
  }

  .loader {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 24px 14px;
    text-align: center;
  }

  .split-pane {
    display: flex;
    gap: 0;
    padding: 14px;
  }

  .pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .pane-divider {
    width: 1px;
    background: var(--color-border);
    margin: 0 14px;
    flex-shrink: 0;
  }

  .pane-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
</style>
