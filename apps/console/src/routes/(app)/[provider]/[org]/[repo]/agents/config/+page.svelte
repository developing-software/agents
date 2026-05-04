<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import type { PageProps } from './$types';
  import type { AgentDiscovery } from '@agents/core/agent';
  import AgentPairEditor from '$lib/features/agents/components/AgentPairEditor.svelte';
  import {
    getAgentPairContent,
    generateClaudeFile,
  } from '$lib/features/agents/api/config.remote';

  let { data }: PageProps = $props();

  type FileContent = { content: string; sha: string };
  type LoadedPair = {
    pair: AgentDiscovery.AgentPair;
    agentsFile: FileContent | null;
    claudeFile: FileContent | null;
  };

  let expandedDir = $state<string | null>(null);
  let editingDir = $state<string | null>(null);
  let loadedPair = $state<LoadedPair | null>(null);
  let loadingDir = $state<string | null>(null);
  let loadError = $state<string | null>(null);
  let generatingDir = $state<string | null>(null);
  let generateError = $state<string | null>(null);

  const pairs = $derived(data.pairs);

  function fileUrl(path: string) {
    return `/${data.provider}/${data.organization}/${data.repoName}/blob/${data.defaultBranch ?? 'main'}/${path}`;
  }

  function dirLabel(dir: string) {
    return dir === '' ? '(root)' : dir + '/';
  }

  async function loadContent(pair: AgentDiscovery.AgentPair): Promise<LoadedPair> {
    const result = await getAgentPairContent({
      organization: data.organization,
      repoName: data.repoName,
      agentsPath: pair.agentsPath,
      claudePath: pair.claudePath,
      claudeExists: pair.claudeExists,
    });
    return { pair, agentsFile: result.agentsFile, claudeFile: result.claudeFile };
  }

  async function handleView(pair: AgentDiscovery.AgentPair) {
    if (expandedDir === pair.dir) {
      expandedDir = null;
      loadedPair = null;
      return;
    }
    editingDir = null;
    loadError = null;
    loadingDir = pair.dir;
    try {
      loadedPair = await loadContent(pair);
      expandedDir = pair.dir;
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to load content';
    } finally {
      loadingDir = null;
    }
  }

  async function handleEdit(pair: AgentDiscovery.AgentPair) {
    if (editingDir === pair.dir) {
      editingDir = null;
      loadedPair = null;
      return;
    }
    expandedDir = null;
    loadError = null;
    loadingDir = pair.dir;
    try {
      loadedPair = await loadContent(pair);
      editingDir = pair.dir;
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to load content';
    } finally {
      loadingDir = null;
    }
  }

  async function handleGenerate(pair: AgentDiscovery.AgentPair) {
    generateError = null;
    generatingDir = pair.dir;
    try {
      await generateClaudeFile({
        organization: data.organization,
        repoName: data.repoName,
        agentsPath: pair.agentsPath,
      });
      await invalidateAll();
    } catch (err) {
      generateError = err instanceof Error ? err.message : 'Failed to generate CLAUDE.md';
    } finally {
      generatingDir = null;
    }
  }

  function handleEditorSave() {
    editingDir = null;
    loadedPair = null;
    invalidateAll();
  }

  function handleEditorCancel() {
    editingDir = null;
    loadedPair = null;
  }
</script>

<svelte:head>
  <title>Config — {data.organization}/{data.repoName}</title>
</svelte:head>

<h2 class="section-heading">Agent Configuration</h2>

<!-- Summary cards -->
<div class="summary-row">
  <div class="summary-card">
    <span class="summary-label">.agents/</span>
    {#if data.agentsFolder?.exists}
      <span class="status status-ok">{data.agentsFolder.entries.length} entries</span>
    {:else}
      <span class="status status-dim">not found</span>
    {/if}
  </div>
  <div class="summary-card">
    <span class="summary-label">.claude/</span>
    {#if data.claudeFolder.length > 0}
      <span class="status status-ok">{data.claudeFolder.length} file{data.claudeFolder.length === 1 ? '' : 's'}</span>
    {:else}
      <span class="status status-dim">not found</span>
    {/if}
  </div>
  <div class="summary-card">
    <span class="summary-label">AGENTS.md pairs</span>
    {#if pairs.length > 0}
      <span class="status status-ok">{pairs.length} found</span>
    {:else}
      <span class="status status-dim">none</span>
    {/if}
  </div>
</div>

<!-- Pairs table -->
<div class="pairs-section">
  <h3 class="pairs-heading">AGENTS.md / CLAUDE.md Pairs</h3>

  {#if pairs.length === 0}
    <div class="empty-state">
      <p class="empty-text">No AGENTS.md files found in this repository.</p>
      <p class="hint">Add an AGENTS.md file to provide instructions for your agents.</p>
    </div>
  {:else}
    <div class="pairs-table" role="table" aria-label="Agent configuration pairs">
      <!-- Header -->
      <div class="table-header" role="row">
        <div class="col-dir" role="columnheader">Directory</div>
        <div class="col-file" role="columnheader">AGENTS.md</div>
        <div class="col-file" role="columnheader">CLAUDE.md</div>
        <div class="col-actions" role="columnheader">Actions</div>
      </div>

      {#each pairs as pair (pair.dir)}
        {@const isExpanded = expandedDir === pair.dir}
        {@const isEditing = editingDir === pair.dir}
        {@const isLoading = loadingDir === pair.dir}

        <div class="table-row" class:row-expanded={isExpanded || isEditing} role="row">
          <!-- Directory -->
          <div class="col-dir" role="cell">
            <span class="dir-label">{dirLabel(pair.dir)}</span>
          </div>

          <!-- AGENTS.md -->
          <div class="col-file" role="cell">
            {#if pair.agentsIsSymlink}
              <span class="file-symlink" title="Symlink">
                <a href={fileUrl(pair.agentsPath)} class="file-link">{pair.agentsPath}</a>
                <span class="symlink-badge">symlink</span>
              </span>
            {:else}
              <a href={fileUrl(pair.agentsPath)} class="file-link">{pair.agentsPath}</a>
            {/if}
            <span class="file-status status-ok" title="Present">✓</span>
          </div>

          <!-- CLAUDE.md -->
          <div class="col-file" role="cell">
            {#if pair.claudeExists}
              {#if pair.claudeIsSymlink}
                <span class="file-symlink" title="Symlink">
                  <a href={fileUrl(pair.claudePath)} class="file-link">{pair.claudePath}</a>
                  <span class="symlink-badge">symlink</span>
                </span>
              {:else}
                <a href={fileUrl(pair.claudePath)} class="file-link">{pair.claudePath}</a>
              {/if}
              <span class="file-status status-ok" title="Present">✓</span>
            {:else}
              <span class="file-missing">{pair.claudePath}</span>
              <span class="file-status status-warn" title="Missing">✗</span>
            {/if}
          </div>

          <!-- Actions -->
          <div class="col-actions" role="cell">
            <button
              type="button"
              class="action-btn"
              class:active={isExpanded}
              onclick={() => handleView(pair)}
              disabled={isLoading || isEditing}
              title="View file contents"
            >
              {isLoading && !isEditing ? '…' : isExpanded ? 'Close' : 'View'}
            </button>
            <button
              type="button"
              class="action-btn"
              class:active={isEditing}
              onclick={() => handleEdit(pair)}
              disabled={isLoading || isExpanded}
              title="Edit files"
            >
              {isLoading && isEditing ? '…' : isEditing ? 'Close' : 'Edit'}
            </button>
            {#if !pair.claudeExists}
              <button
                type="button"
                class="action-btn action-btn-generate"
                onclick={() => handleGenerate(pair)}
                disabled={generatingDir === pair.dir}
                title="Generate a starter CLAUDE.md"
              >
                {generatingDir === pair.dir ? 'Generating…' : 'Generate'}
              </button>
            {/if}
          </div>
        </div>

        <!-- Load error -->
        {#if loadError && loadingDir === null && (expandedDir === pair.dir || editingDir === pair.dir)}
          <div class="row-detail error-detail" role="row">
            <div class="col-full" role="cell">
              <p class="load-error">{loadError}</p>
            </div>
          </div>
        {/if}

        <!-- Generate error -->
        {#if generateError && generatingDir === null && pair.dir === pairs.find(p => !p.claudeExists)?.dir}
          <div class="row-detail error-detail" role="row">
            <div class="col-full" role="cell">
              <p class="load-error">{generateError}</p>
            </div>
          </div>
        {/if}

        <!-- Expanded: read-only view -->
        {#if isExpanded && loadedPair?.pair.dir === pair.dir}
          <div class="row-detail view-detail" role="row">
            <div class="col-full" role="cell">
              <div class="view-panes">
                <div class="view-pane">
                  <div class="view-pane-header">
                    <span class="pane-label">{pair.agentsPath}</span>
                  </div>
                  <pre class="file-preview">{loadedPair.agentsFile?.content ?? '(empty)'}</pre>
                </div>
                <div class="view-pane">
                  <div class="view-pane-header">
                    <span class="pane-label">{pair.claudePath}</span>
                    {#if !pair.claudeExists}
                      <span class="missing-badge">missing</span>
                    {/if}
                  </div>
                  {#if loadedPair.claudeFile}
                    <pre class="file-preview">{loadedPair.claudeFile.content}</pre>
                  {:else}
                    <p class="no-file-hint">No CLAUDE.md found in this directory.</p>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Edit mode -->
        {#if isEditing && loadedPair?.pair.dir === pair.dir && loadedPair.agentsFile}
          <div class="row-detail edit-detail" role="row">
            <div class="col-full" role="cell">
              <AgentPairEditor
                {pair}
                agentsFile={loadedPair.agentsFile}
                claudeFile={loadedPair.claudeFile}
                organization={data.organization}
                repoName={data.repoName}
                onSave={handleEditorSave}
                onCancel={handleEditorCancel}
              />
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Heading                                                             */
  /* ------------------------------------------------------------------ */
  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  /* ------------------------------------------------------------------ */
  /* Summary row                                                         */
  /* ------------------------------------------------------------------ */
  .summary-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 6px 10px;
  }

  .summary-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text);
  }

  /* ------------------------------------------------------------------ */
  /* Status                                                              */
  /* ------------------------------------------------------------------ */
  .status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    flex-shrink: 0;
  }

  .status-ok { color: var(--color-success); }
  .status-dim { color: var(--color-dim); }
  .status-warn { color: var(--color-warn, #d9a445); }

  /* ------------------------------------------------------------------ */
  /* Pairs section                                                        */
  /* ------------------------------------------------------------------ */
  .pairs-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pairs-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
    margin: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Empty state                                                          */
  /* ------------------------------------------------------------------ */
  .empty-state {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 20px 16px;
  }

  .empty-text {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--color-text);
  }

  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* Table                                                               */
  /* ------------------------------------------------------------------ */
  .pairs-table {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .table-header {
    display: grid;
    grid-template-columns: 160px 1fr 1fr 180px;
    gap: 0;
    padding: 6px 12px;
    background: var(--color-elevated);
    border-bottom: 1px solid var(--color-border);
  }

  .table-header [role="columnheader"] {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
  }

  .table-row {
    display: grid;
    grid-template-columns: 160px 1fr 1fr 180px;
    gap: 0;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    align-items: center;
    transition: background 0.1s;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row.row-expanded {
    border-bottom: 1px solid var(--color-border);
  }

  .row-detail {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
  }

  .row-detail:last-child {
    border-bottom: none;
  }

  .col-full {
    padding: 12px;
  }

  /* ------------------------------------------------------------------ */
  /* Dir column                                                          */
  /* ------------------------------------------------------------------ */
  .dir-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 500;
  }

  /* ------------------------------------------------------------------ */
  /* File columns                                                        */
  /* ------------------------------------------------------------------ */
  .col-file {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding-right: 8px;
  }

  .file-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .file-link:hover {
    text-decoration: underline;
  }

  .file-missing {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .file-status {
    font-size: 12px;
    flex-shrink: 0;
  }

  .file-symlink {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .symlink-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-dim);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 0 3px;
    flex-shrink: 0;
  }

  .missing-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-warn, #d9a445);
    border: 1px solid var(--color-warn, #d9a445);
    border-radius: 3px;
    padding: 0 3px;
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Actions column                                                       */
  /* ------------------------------------------------------------------ */
  .col-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .action-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 9px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    white-space: nowrap;
  }

  .action-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .action-btn:not(:disabled):hover {
    border-color: var(--color-muted);
    background: var(--color-elevated);
  }

  .action-btn.active {
    background: var(--color-elevated);
    border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
    color: var(--color-accent);
  }

  .action-btn-generate {
    color: var(--color-success);
    border-color: color-mix(in srgb, var(--color-success) 30%, var(--color-border));
  }

  .action-btn-generate:not(:disabled):hover {
    background: color-mix(in srgb, var(--color-success) 8%, var(--color-surface));
  }

  /* ------------------------------------------------------------------ */
  /* View panes                                                           */
  /* ------------------------------------------------------------------ */
  .view-panes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .view-pane {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .view-pane-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pane-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .file-preview {
    margin: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 8px 10px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    line-height: 1.6;
    max-height: 300px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .no-file-hint {
    margin: 0;
    font-size: 11px;
    color: var(--color-dim);
    padding: 8px 0;
  }

  /* ------------------------------------------------------------------ */
  /* Error states                                                         */
  /* ------------------------------------------------------------------ */
  .error-detail {
    background: color-mix(in srgb, var(--color-danger, #e05c5c) 5%, var(--color-elevated));
  }

  .load-error {
    margin: 0;
    font-size: 11px;
    color: var(--color-danger, #e05c5c);
  }

  /* ------------------------------------------------------------------ */
  /* Responsive                                                           */
  /* ------------------------------------------------------------------ */
  @media (max-width: 700px) {
    .table-header,
    .table-row {
      grid-template-columns: 1fr;
    }

    .table-header [role="columnheader"]:not(:first-child) {
      display: none;
    }

    .view-panes {
      grid-template-columns: 1fr;
    }
  }
</style>
