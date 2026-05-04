<script lang="ts">
  import { beforeNavigate, invalidateAll } from '$app/navigation';
  import { AgentDiscovery } from '@agents/core/agent';
  import { getConfigPair, updateConfigFile, validateConfigContent } from '$lib/features/agents/api/config.remote';
  import Markdown from '$lib/ui/Markdown.svelte';

  interface Props {
    open: boolean;
    pair: AgentDiscovery.ConfigPair | null;
    organization: string;
    repoName: string;
  }

  let { open = $bindable(false), pair = null, organization, repoName }: Props = $props();

  type EditorMode = 'edit' | 'preview' | 'changes';
  type ValidationState = { valid: boolean; issues: string[] } | null;

  let mode = $state<EditorMode>('edit');
  let loading = $state(false);
  let saving = $state(false);
  let loadError = $state('');
  let validation = $state<ValidationState>(null);

  let agentsPath = $state('');
  let claudePath = $state('');
  let agentsSha = $state<string | null>(null);
  let claudeSha = $state<string | null>(null);
  let hasClaudeFile = $state(false);

  let initialAgentsContent = $state('');
  let initialClaudeContent = $state('');
  let agentsContent = $state('');
  let claudeContent = $state('');

  let dirty = $derived(
    agentsContent !== initialAgentsContent ||
      (hasClaudeFile && claudeContent !== initialClaudeContent),
  );

  let title = $derived(pair ? `Edit ${pair.directory || 'root'} config` : 'Edit config');

  beforeNavigate((navigation) => {
    if (!open || !dirty) return;
    if (!window.confirm('Discard unsaved config changes?')) {
      navigation.cancel();
    }
  });

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!open || !dirty) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function resetEditor() {
    mode = 'edit';
    loadError = '';
    validation = null;
    agentsPath = '';
    claudePath = '';
    agentsSha = null;
    claudeSha = null;
    hasClaudeFile = false;
    initialAgentsContent = '';
    initialClaudeContent = '';
    agentsContent = '';
    claudeContent = '';
  }

  async function loadSelectedPair(currentPair: AgentDiscovery.ConfigPair) {
    loading = true;
    loadError = '';

    try {
      const result = await getConfigPair({
        organization,
        repoName,
        agentsPath: currentPair.agents.path,
      });
      agentsPath = result.files.agents.path;
      claudePath = result.files.proposedClaudePath;
      agentsSha = result.files.agents.sha;
      claudeSha = result.files.claude?.sha ?? null;
      hasClaudeFile = !!result.files.claude;
      initialAgentsContent = result.files.agents.content;
      initialClaudeContent = result.files.claude?.content ?? '';
      agentsContent = result.files.agents.content;
      claudeContent = result.files.claude?.content ?? '';
    } catch (cause) {
      loadError = cause instanceof Error ? cause.message : 'Failed to load config files';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!open || !pair) {
      resetEditor();
      return;
    }
    void loadSelectedPair(pair);
  });

  function requestClose() {
    if (dirty && !window.confirm('Discard unsaved config changes?')) return;
    open = false;
  }

  async function runValidation() {
    const requests = [
      validateConfigContent({ organization, repoName, path: agentsPath, content: agentsContent }),
    ];
    if (hasClaudeFile) {
      requests.push(
        validateConfigContent({ organization, repoName, path: claudePath, content: claudeContent }),
      );
    }

    const results = await Promise.all(requests);
    const issues = results.flatMap((result) => result.issues);
    validation = {
      valid: issues.length === 0,
      issues,
    };
    return validation;
  }

  async function saveChanges() {
    if (!agentsPath || saving) return;
    saving = true;
    loadError = '';

    try {
      const nextValidation = await runValidation();
      if (!nextValidation.valid) return;

      const writes = [];
      if (agentsContent !== initialAgentsContent) {
        writes.push(
          updateConfigFile({
            organization,
            repoName,
            path: agentsPath,
            content: agentsContent,
            sha: agentsSha,
          }),
        );
      }

      if (hasClaudeFile && claudeContent !== initialClaudeContent) {
        writes.push(
          updateConfigFile({
            organization,
            repoName,
            path: claudePath,
            content: claudeContent,
            sha: claudeSha,
          }),
        );
      }

      if (writes.length > 0) {
        await Promise.all(writes);
      }

      initialAgentsContent = agentsContent;
      initialClaudeContent = claudeContent;
      await invalidateAll();
      open = false;
    } catch (cause) {
      loadError = cause instanceof Error ? cause.message : 'Failed to save config files';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

{#if open}
  <button type="button" class="overlay" aria-label="Close config editor" onclick={requestClose}></button>
  <div class="drawer" role="dialog" aria-modal="true" aria-label={title}>
    <header class="drawer-header">
      <div>
        <h3>{title}</h3>
        {#if pair}
          <p>{pair.directory || '.'}</p>
        {/if}
      </div>

      <div class="toolbar">
        <div class="tabs">
          <button type="button" class:active={mode === 'edit'} onclick={() => (mode = 'edit')}>Edit</button>
          <button type="button" class:active={mode === 'preview'} onclick={() => (mode = 'preview')}>Preview</button>
          <button type="button" class:active={mode === 'changes'} onclick={() => (mode = 'changes')}>Changes</button>
        </div>
        <button type="button" class="ghost" onclick={runValidation} disabled={loading || saving}>Validate</button>
        <button type="button" class="primary" onclick={saveChanges} disabled={loading || saving}>Save</button>
        <button type="button" class="ghost" onclick={requestClose}>Close</button>
      </div>
    </header>

    {#if loadError}
      <div class="banner error">{loadError}</div>
    {/if}

    {#if validation}
      <div class="banner" class:ok={validation.valid} class:error={!validation.valid}>
        {#if validation.valid}
          Validation passed.
        {:else}
          {validation.issues.join(' ')}
        {/if}
      </div>
    {/if}

    {#if loading}
      <div class="state">Loading config files...</div>
    {:else if pair}
      <div class="panes">
        <article class="pane">
          <div class="pane-header">
            <span>AGENTS.md</span>
            <code>{agentsPath}</code>
          </div>
          {#if mode === 'preview'}
            <div class="preview"><Markdown source={agentsContent} /></div>
          {:else if mode === 'changes'}
            <div class="compare">
              <section>
                <span class="compare-label">Before</span>
                <pre>{initialAgentsContent}</pre>
              </section>
              <section>
                <span class="compare-label">After</span>
                <pre>{agentsContent}</pre>
              </section>
            </div>
          {:else}
            <textarea class="editor" bind:value={agentsContent} spellcheck="false"></textarea>
          {/if}
        </article>

        <article class="pane">
          <div class="pane-header">
            <span>CLAUDE.md</span>
            <code>{claudePath}</code>
          </div>
          {#if hasClaudeFile}
            {#if mode === 'preview'}
              <div class="preview"><Markdown source={claudeContent} /></div>
            {:else if mode === 'changes'}
              <div class="compare">
                <section>
                  <span class="compare-label">Before</span>
                  <pre>{initialClaudeContent}</pre>
                </section>
                <section>
                  <span class="compare-label">After</span>
                  <pre>{claudeContent}</pre>
                </section>
              </div>
            {:else}
              <textarea class="editor" bind:value={claudeContent} spellcheck="false"></textarea>
            {/if}
          {:else}
            <div class="state missing">
              <strong>CLAUDE.md is missing.</strong>
              <p>Use Generate on the config page to create it from the paired AGENTS.md file.</p>
            </div>
          {/if}
        </article>
      </div>
    {/if}
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 55%);
    z-index: 100;
    border: none;
    padding: 0;
    cursor: default;
  }

  .drawer {
    position: fixed;
    inset: 18px;
    z-index: 101;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--color-border);
  }

  h3 {
    margin: 0;
    font-size: 13px;
    color: var(--color-text);
  }

  .drawer-header p {
    margin: 4px 0 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tabs {
    display: flex;
    gap: 2px;
    padding: 2px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .tabs button,
  .ghost,
  .primary {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    padding: 4px 10px;
    background: var(--color-elevated);
    color: var(--color-text);
    cursor: pointer;
  }

  .tabs button {
    border: none;
    background: transparent;
    color: var(--color-muted);
  }

  .tabs button.active {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .primary {
    background: color-mix(in srgb, var(--color-accent) 16%, transparent);
    border-color: color-mix(in srgb, var(--color-accent) 32%, var(--color-border));
    color: var(--color-accent);
  }

  .tabs button:disabled,
  .ghost:disabled,
  .primary:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .banner {
    padding: 8px 14px;
    border-bottom: 1px solid var(--color-border);
    font-size: 11px;
    color: var(--color-text);
  }

  .banner.ok {
    background: var(--color-success-dim);
    color: var(--color-success);
  }

  .banner.error {
    background: var(--color-danger-dim);
    color: var(--color-danger);
  }

  .state {
    padding: 18px;
    color: var(--color-muted);
    font-size: 12px;
  }

  .state.missing p {
    margin: 6px 0 0;
  }

  .panes {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
    min-height: 0;
    flex: 1;
  }

  .pane {
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  .pane-header span {
    color: var(--color-text);
    font-weight: 600;
  }

  code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor,
  .preview,
  .compare {
    flex: 1;
    min-height: 320px;
    background: var(--color-elevated);
  }

  .editor {
    width: 100%;
    border: none;
    padding: 12px;
    resize: none;
    outline: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--color-text);
  }

  .preview {
    overflow: auto;
    padding: 12px;
  }

  .compare {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .compare section {
    min-width: 0;
    border-right: 1px solid var(--color-border);
  }

  .compare section:last-child {
    border-right: none;
  }

  .compare-label {
    display: block;
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  pre {
    margin: 0;
    padding: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: var(--color-text);
  }

  @media (max-width: 900px) {
    .drawer {
      inset: 0;
      border-radius: 0;
    }

    .drawer-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .panes,
    .compare {
      grid-template-columns: minmax(0, 1fr);
    }

    .compare section {
      border-right: none;
      border-bottom: 1px solid var(--color-border);
    }

    .compare section:last-child {
      border-bottom: none;
    }
  }
</style>
