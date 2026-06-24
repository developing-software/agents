<script lang="ts">
  import { beforeNavigate, invalidateAll } from '$app/navigation';
  import type { AgentDiscovery } from '@agents/core/agent';
  import Drawer from '$lib/ui/Drawer.svelte';
  import MarkdownEditor from '$lib/ui/MarkdownEditor.svelte';
  import { loadConfigPair, saveConfigPair } from '../api/config.remote';
  import { formatDirectoryLabel, validateConfigContent } from './helpers';

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  let isOpen = $state(false);
  let drawerTitle = $state('Edit Agent Config');
  let currentPair = $state<AgentDiscovery.ConfigPair | null>(null);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let agentsValue = $state('');
  let claudeValue = $state('');
  let initialAgentsValue = $state('');
  let initialClaudeValue = $state('');
  let loadVersion = 0;

  function filePath(name: 'AGENTS.md' | 'CLAUDE.md'): string {
    if (!currentPair) return name;
    const current = name === 'AGENTS.md' ? currentPair.agents : currentPair.claude;
    return current?.originalPath ?? (currentPair.directory ? `${currentPair.directory}/${name}` : name);
  }

  function isMirrored(
    current: AgentDiscovery.ConfigFile | null | undefined,
    other: AgentDiscovery.ConfigFile | null | undefined,
  ): boolean {
    return !!current?.isSymlink && !!other && current.originalPath === other.originalPath;
  }

  const agentsLocked = $derived(isMirrored(currentPair?.agents, currentPair?.claude));
  const claudeLocked = $derived(isMirrored(currentPair?.claude, currentPair?.agents));
  const agentsErrors = $derived(
    currentPair?.agents || agentsValue.trim() ? validateConfigContent(agentsValue) : [],
  );
  const claudeErrors = $derived(
    currentPair?.claude || claudeValue.trim() ? validateConfigContent(claudeValue) : [],
  );
  const dirty = $derived(
    agentsValue !== initialAgentsValue || claudeValue !== initialClaudeValue,
  );
  const canSave = $derived(
    dirty && agentsErrors.length === 0 && claudeErrors.length === 0 && !loading && !saving,
  );

  beforeNavigate((navigation) => {
    if (!isOpen || !dirty) return;
    if (!confirm('Discard unsaved config changes?')) {
      navigation.cancel();
    }
  });

  export async function open(pair: AgentDiscovery.ConfigPair) {
    currentPair = pair;
    drawerTitle = `Edit Config · ${formatDirectoryLabel(pair.directory)}`;
    isOpen = true;
    await refresh(pair);
  }

  export function close() {
    if (canClose()) {
      reset();
    }
  }

  function reset() {
    isOpen = false;
    currentPair = null;
    error = null;
    loading = false;
    saving = false;
    agentsValue = '';
    claudeValue = '';
    initialAgentsValue = '';
    initialClaudeValue = '';
  }

  async function refresh(pair: AgentDiscovery.ConfigPair) {
    const version = ++loadVersion;
    loading = true;
    error = null;

    try {
      const result = await loadConfigPair({
        organization,
        repoName,
        directory: pair.directory,
      });
      if (version !== loadVersion) return;

      currentPair = result.pair;
      agentsValue = result.agentsContent ?? '';
      claudeValue = result.claudeContent ?? '';
      initialAgentsValue = result.agentsContent ?? '';
      initialClaudeValue = result.claudeContent ?? '';
    } catch (err) {
      if (version !== loadVersion) return;
      error = err instanceof Error ? err.message : 'Failed to load config files';
    } finally {
      if (version === loadVersion) loading = false;
    }
  }

  function canClose(): boolean {
    return !dirty || confirm('Discard unsaved config changes?');
  }

  function beforeUnload(event: BeforeUnloadEvent) {
    if (!isOpen || !dirty) return;
    event.preventDefault();
    event.returnValue = '';
  }

  async function handleSave() {
    if (!currentPair || !canSave) return;

    const files: Array<{ name: 'AGENTS.md' | 'CLAUDE.md'; content: string }> = [];

    if (!agentsLocked && agentsValue !== initialAgentsValue && (currentPair.agents || agentsValue.trim())) {
      files.push({ name: 'AGENTS.md', content: agentsValue });
    }

    if (!claudeLocked && claudeValue !== initialClaudeValue && (currentPair.claude || claudeValue.trim())) {
      files.push({ name: 'CLAUDE.md', content: claudeValue });
    }

    if (files.length === 0) {
      error = 'No editable changes to save';
      return;
    }

    saving = true;
    error = null;

    try {
      await saveConfigPair({
        organization,
        repoName,
        directory: currentPair.directory,
        files,
      });
      await invalidateAll();
      reset();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save config files';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:window onbeforeunload={beforeUnload} />

<Drawer bind:open={isOpen} title={drawerTitle} width="1180px" canclose={canClose} onclose={reset}>
  <div class="editor-shell">
    <div class="editor-toolbar">
      <div class="toolbar-copy">
        <div class="toolbar-title">Side-by-side editor</div>
        {#if currentPair}
          <div class="toolbar-subtitle mono">{formatDirectoryLabel(currentPair.directory)}</div>
        {/if}
      </div>

      <div class="toolbar-actions">
        <button type="button" class="secondary-btn" disabled={loading || saving} onclick={() => currentPair && refresh(currentPair)}>
          Reload
        </button>
        <button type="button" class="primary-btn" disabled={!canSave} onclick={handleSave}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>

    {#if error}
      <div class="error-banner">{error}</div>
    {/if}

    {#if loading}
      <div class="loading-state">Loading config files...</div>
    {:else if currentPair}
      <div class="pane-grid">
        <section class="pane">
          <div class="pane-header">
            <div>
              <div class="pane-title">AGENTS.md</div>
              <div class="pane-path mono">{filePath('AGENTS.md')}</div>
            </div>
            {#if currentPair.agents?.isSymlink}
              <span class="pane-badge">symlink</span>
            {:else if !currentPair.agents}
              <span class="pane-badge pane-badge-warning">new file</span>
            {/if}
          </div>

          {#if agentsLocked}
            <div class="pane-note">AGENTS.md resolves to the same original file as CLAUDE.md, so only one editable source is shown.</div>
          {/if}

          <MarkdownEditor bind:value={agentsValue} minHeight="420px" placeholder="AGENTS.md content" readonly={agentsLocked} />

          {#if agentsErrors.length > 0}
            <div class="validation-list">
              {#each agentsErrors as message (message)}
                <div class="validation-error">{message}</div>
              {/each}
            </div>
          {/if}
        </section>

        <section class="pane">
          <div class="pane-header">
            <div>
              <div class="pane-title">CLAUDE.md</div>
              <div class="pane-path mono">{filePath('CLAUDE.md')}</div>
            </div>
            {#if currentPair.claude?.isSymlink}
              <span class="pane-badge">symlink</span>
            {:else if !currentPair.claude}
              <span class="pane-badge pane-badge-warning">new file</span>
            {/if}
          </div>

          {#if claudeLocked}
            <div class="pane-note">CLAUDE.md is a symlink to AGENTS.md, so edits flow through the original file.</div>
          {:else if !currentPair.claude}
            <div class="pane-note">Create a missing CLAUDE.md here or use the generate action for a template-driven draft.</div>
          {/if}

          <MarkdownEditor bind:value={claudeValue} minHeight="420px" placeholder="CLAUDE.md content" readonly={claudeLocked} />

          {#if claudeErrors.length > 0}
            <div class="validation-list">
              {#each claudeErrors as message (message)}
                <div class="validation-error">{message}</div>
              {/each}
            </div>
          {/if}
        </section>
      </div>
    {/if}
  </div>
</Drawer>

<style>
  .editor-shell {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .toolbar-title {
    font-size: 13px;
    color: var(--color-text);
  }

  .toolbar-subtitle {
    margin-top: 3px;
    font-size: 11px;
    color: var(--color-dim);
  }

  .toolbar-actions {
    display: flex;
    gap: 8px;
  }

  .primary-btn,
  .secondary-btn {
    border-radius: 4px;
    padding: 6px 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s;
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
  .loading-state,
  .pane-note,
  .validation-error {
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .error-banner,
  .validation-error {
    color: var(--color-danger);
    border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent);
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  }

  .loading-state,
  .pane-note {
    color: var(--color-dim);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .pane-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }

  .pane {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pane-header {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: flex-start;
  }

  .pane-title {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text);
  }

  .pane-path {
    margin-top: 4px;
    font-size: 10px;
    color: var(--color-dim);
    word-break: break-word;
  }

  .pane-badge {
    flex-shrink: 0;
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-warning-dim);
    color: var(--color-warning);
    font-family: var(--font-mono);
    font-size: 10px;
  }

  .pane-badge-warning {
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .validation-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  @media (max-width: 900px) {
    .editor-toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .toolbar-actions {
      justify-content: flex-start;
    }

    .pane-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
