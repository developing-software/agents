<script lang="ts">
  import Drawer from '$lib/ui/Drawer.svelte';
  import MarkdownEditor from '$lib/ui/MarkdownEditor.svelte';
  import { getFileContent, updateFile } from '../api/config.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  let {
    onsaved,
  }: {
    onsaved?: () => void;
  } = $props();

  const repo = repoContext.get();

  let isOpen = $state(false);
  let directory = $state('');
  let agentsPath = $state<string | null>(null);
  let claudePath = $state<string | null>(null);

  let agentsContent = $state('');
  let claudeContent = $state('');
  let agentsOriginal = $state('');
  let claudeOriginal = $state('');
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let activeTab = $state<'agents' | 'claude'>('agents');

  let hasUnsavedChanges = $derived(
    agentsContent !== agentsOriginal || claudeContent !== claudeOriginal,
  );

  export function open(pair: {
    directory: string;
    agentsPath: string | null;
    claudePath: string | null;
  }) {
    directory = pair.directory;
    agentsPath = pair.agentsPath;
    claudePath = pair.claudePath;
    agentsContent = '';
    claudeContent = '';
    agentsOriginal = '';
    claudeOriginal = '';
    error = null;
    activeTab = pair.agentsPath ? 'agents' : 'claude';
    isOpen = true;
    loadContent();
  }

  async function loadContent() {
    loading = true;
    error = null;
    try {
      const [agentsResult, claudeResult] = await Promise.all([
        agentsPath
          ? getFileContent({ organization: repo.organization, repoName: repo.repoName, path: agentsPath })
          : Promise.resolve(null),
        claudePath
          ? getFileContent({ organization: repo.organization, repoName: repo.repoName, path: claudePath })
          : Promise.resolve(null),
      ]);
      agentsContent = agentsResult ?? '';
      claudeContent = claudeResult ?? '';
      agentsOriginal = agentsContent;
      claudeOriginal = claudeContent;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load files';
    } finally {
      loading = false;
    }
  }

  async function handleSave() {
    saving = true;
    error = null;
    try {
      const updates: Promise<unknown>[] = [];
      if (agentsPath && agentsContent !== agentsOriginal) {
        updates.push(
          updateFile({
            organization: repo.organization,
            repoName: repo.repoName,
            path: agentsPath,
            content: agentsContent,
          }),
        );
      }
      if (claudePath && claudeContent !== claudeOriginal) {
        updates.push(
          updateFile({
            organization: repo.organization,
            repoName: repo.repoName,
            path: claudePath,
            content: claudeContent,
          }),
        );
      }
      await Promise.all(updates);
      agentsOriginal = agentsContent;
      claudeOriginal = claudeContent;
      onsaved?.();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }

  function handleClose() {
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard?')) return;
    isOpen = false;
  }
</script>

<Drawer bind:open={isOpen} title="Edit — {directory || '.'}" onclose={handleClose} width="900px">
  <div class="editor-content">
    {#if loading}
      <div class="loading-msg">Loading files...</div>
    {:else}
      <div class="tab-bar">
        {#if agentsPath}
          <button
            type="button"
            class="tab"
            class:tab-active={activeTab === 'agents'}
            onclick={() => { activeTab = 'agents'; }}
          >
            AGENTS.md
            {#if agentsContent !== agentsOriginal}
              <span class="modified-dot"></span>
            {/if}
          </button>
        {/if}
        {#if claudePath}
          <button
            type="button"
            class="tab"
            class:tab-active={activeTab === 'claude'}
            onclick={() => { activeTab = 'claude'; }}
          >
            CLAUDE.md
            {#if claudeContent !== claudeOriginal}
              <span class="modified-dot"></span>
            {/if}
          </button>
        {/if}
      </div>

      <div class="editor-pane">
        {#if activeTab === 'agents' && agentsPath}
          <MarkdownEditor bind:value={agentsContent} placeholder="AGENTS.md content..." minHeight="400px" />
        {:else if activeTab === 'claude' && claudePath}
          <MarkdownEditor bind:value={claudeContent} placeholder="CLAUDE.md content..." minHeight="400px" />
        {:else}
          <div class="empty-pane">File not found in this directory.</div>
        {/if}
      </div>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <div class="editor-footer">
        <button type="button" class="btn btn-secondary" onclick={handleClose}>Cancel</button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={saving || !hasUnsavedChanges}
          onclick={handleSave}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    {/if}
  </div>
</Drawer>

<style>
  .editor-content {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-height: 0;
  }

  .loading-msg {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 20px 0;
  }

  .tab-bar {
    display: flex;
    gap: 2px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px;
    flex-shrink: 0;
  }

  .tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 12px;
    border-radius: 3px;
    border: none;
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    line-height: 1.6;
    transition: color 0.1s, background 0.1s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tab:hover { color: var(--color-muted); }
  .tab-active { background: var(--color-surface); color: var(--color-text); }

  .modified-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent);
    flex-shrink: 0;
  }

  .editor-pane {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .editor-pane :global(.editor) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .editor-pane :global(.editor-textarea),
  .editor-pane :global(.preview) {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .empty-pane {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 20px;
    text-align: center;
  }

  .error-msg {
    font-size: 11px;
    color: var(--color-danger);
    padding: 6px 10px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  }

  .editor-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
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
