<script lang="ts">
  import Drawer from '$lib/ui/Drawer.svelte';
  import { getAgentPairContent, updateAgentFile } from '../api/config.remote';
  import { repoContext } from '$lib/features/git/context.svelte';
  import { beforeNavigate } from '$app/navigation';

  let {
    onsaved,
  }: {
    onsaved?: () => void;
  } = $props();

  const repo = repoContext.get();

  let isOpen = $state(false);
  let directory = $state('.');
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  let agentsContent = $state('');
  let claudeContent = $state('');
  let originalAgents = $state('');
  let originalClaude = $state('');

  let activeTab = $state<'agents' | 'claude'>('agents');

  let hasAgentsFile = $state(false);
  let hasClaudeFile = $state(false);

  const isDirty = $derived(
    agentsContent !== originalAgents || claudeContent !== originalClaude,
  );

  const agentsPath = $derived(directory === '.' ? 'AGENTS.md' : `${directory}/AGENTS.md`);
  const claudePath = $derived(directory === '.' ? 'CLAUDE.md' : `${directory}/CLAUDE.md`);

  beforeNavigate(({ cancel }) => {
    if (isDirty && !confirm('You have unsaved changes. Discard them?')) {
      cancel();
    }
  });

  export function open(dir: string, opts?: { hasAgents?: boolean; hasClaude?: boolean }) {
    directory = dir;
    hasAgentsFile = opts?.hasAgents ?? false;
    hasClaudeFile = opts?.hasClaude ?? false;
    error = null;
    saving = false;
    activeTab = hasAgentsFile ? 'agents' : 'claude';
    isOpen = true;
    loadContent();
  }

  function close() {
    if (isDirty && !confirm('You have unsaved changes. Discard them?')) return;
    isOpen = false;
  }

  async function loadContent() {
    loading = true;
    error = null;
    try {
      const result = await getAgentPairContent({
        organization: repo.organization,
        repoName: repo.repoName,
        directory,
      });
      agentsContent = result.agentsContent ?? '';
      claudeContent = result.claudeContent ?? '';
      originalAgents = agentsContent;
      originalClaude = claudeContent;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to load content';
    } finally {
      loading = false;
    }
  }

  async function save() {
    saving = true;
    error = null;
    try {
      const promises: Promise<void>[] = [];
      if (agentsContent !== originalAgents && hasAgentsFile) {
        promises.push(
          updateAgentFile({
            organization: repo.organization,
            repoName: repo.repoName,
            path: agentsPath,
            content: agentsContent,
          }),
        );
      }
      if (claudeContent !== originalClaude && hasClaudeFile) {
        promises.push(
          updateAgentFile({
            organization: repo.organization,
            repoName: repo.repoName,
            path: claudePath,
            content: claudeContent,
          }),
        );
      }
      await Promise.all(promises);
      originalAgents = agentsContent;
      originalClaude = claudeContent;
      onsaved?.();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }
</script>

<Drawer bind:open={isOpen} title="Edit — {directory === '.' ? '/' : directory}" width="720px" onclose={close}>
  <div class="editor-wrap">
    {#if loading}
      <div class="loading">Loading...</div>
    {:else}
      <div class="tab-bar">
        {#if hasAgentsFile}
          <button
            type="button"
            class="tab"
            class:active={activeTab === 'agents'}
            onclick={() => (activeTab = 'agents')}
          >
            AGENTS.md
            {#if agentsContent !== originalAgents}<span class="dot"></span>{/if}
          </button>
        {/if}
        {#if hasClaudeFile}
          <button
            type="button"
            class="tab"
            class:active={activeTab === 'claude'}
            onclick={() => (activeTab = 'claude')}
          >
            CLAUDE.md
            {#if claudeContent !== originalClaude}<span class="dot"></span>{/if}
          </button>
        {/if}
      </div>

      <div class="editor-area">
        {#if activeTab === 'agents' && hasAgentsFile}
          <textarea
            class="code-editor"
            bind:value={agentsContent}
            spellcheck="false"
          ></textarea>
        {/if}
        {#if activeTab === 'claude' && hasClaudeFile}
          <textarea
            class="code-editor"
            bind:value={claudeContent}
            spellcheck="false"
          ></textarea>
        {/if}
      </div>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <div class="footer">
        <span class="status-text">
          {#if isDirty}
            Unsaved changes
          {:else}
            No changes
          {/if}
        </span>
        <div class="footer-actions">
          <button type="button" class="btn btn-secondary" onclick={close}>Cancel</button>
          <button type="button" class="btn btn-primary" onclick={save} disabled={!isDirty || saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    {/if}
  </div>
</Drawer>

<style>
  .editor-wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .loading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 24px 16px;
  }

  .tab-bar {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 500;
    padding: 8px 16px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tab:hover {
    color: var(--color-text);
  }

  .tab.active {
    color: var(--color-text);
    border-bottom-color: var(--color-accent);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent);
    flex-shrink: 0;
  }

  .editor-area {
    flex: 1;
    min-height: 0;
    display: flex;
  }

  .code-editor {
    width: 100%;
    height: 100%;
    min-height: 300px;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
    padding: 12px 16px;
    border: none;
    background: var(--color-bg);
    color: var(--color-text);
    resize: none;
    outline: none;
    tab-size: 2;
  }

  .error-msg {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-error, #e55);
    padding: 6px 16px;
    border-top: 1px solid var(--color-error, #e55);
    background: color-mix(in srgb, var(--color-error, #e55) 8%, transparent);
    flex-shrink: 0;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .status-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .footer-actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    cursor: pointer;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-bg);
  }

  .btn-primary {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }
</style>
