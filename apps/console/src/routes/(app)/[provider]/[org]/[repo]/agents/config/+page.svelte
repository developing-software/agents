<script lang="ts">
  import type { PageProps } from './$types';
  import type { AgentDiscovery } from '@agents/core/agent';
  import { getAgentPairContent } from '$lib/features/agents/api/config.remote';
  import AgentPairEditor from '$lib/features/agents/components/AgentPairEditor.svelte';
  import GenerateClaudeModal from '$lib/features/agents/components/GenerateClaudeModal.svelte';

  let { data }: PageProps = $props();

  const agentsFolder = $derived(data.agentsFolder);
  const claudeFiles = $derived(data.claudeFolder);
  const agentFiles = $derived(data.agentFiles);
  const agentPairs = $derived(data.agentPairs);

  // Filtering/sorting
  type FilterStatus = 'all' | 'paired' | 'missing' | 'symlink';
  let filterStatus = $state<FilterStatus>('all');
  let sortDir = $state<'asc' | 'desc'>('asc');

  const filteredPairs = $derived(
    agentPairs
      .filter((p) => {
        if (filterStatus === 'paired') return p.existsClaude;
        if (filterStatus === 'missing') return !p.existsClaude;
        if (filterStatus === 'symlink') return p.isAgentsSymlink || p.isClaudeSymlink;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const cmp = a.directory.localeCompare(b.directory);
        return sortDir === 'asc' ? cmp : -cmp;
      })
  );

  // Editor state
  type EditorState = {
    pair: AgentDiscovery.AgentPair;
    agentsContent: string | null;
    agentsSha: string | null;
    claudeContent: string | null;
    claudeSha: string | null;
  };

  let editorState = $state<EditorState | null>(null);
  let generatePair = $state<AgentDiscovery.AgentPair | null>(null);
  let loadingPairPath = $state<string | null>(null);

  async function openEditor(pair: AgentDiscovery.AgentPair) {
    loadingPairPath = pair.agentsPath;
    try {
      const content = await getAgentPairContent({
        organization: data.organization,
        repoName: data.repoName,
        agentsPath: pair.agentsPath,
        claudePath: pair.claudePath,
      });
      editorState = { pair, ...content };
    } finally {
      loadingPairPath = null;
    }
  }

  function closeEditor() {
    editorState = null;
  }

  function openGenerate(pair: AgentDiscovery.AgentPair) {
    generatePair = pair;
  }

  function closeGenerate() {
    generatePair = null;
  }

  function toggleSort() {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  }
</script>

<svelte:head>
  <title>Config — {data.organization}/{data.repoName}</title>
</svelte:head>

<h2 class="section-heading">Agent Configuration</h2>

<div class="cards-row">
  <!-- .agents/ folder -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">.agents/ folder</span>
      {#if agentsFolder?.exists}
        <span class="status status-ok">Detected</span>
      {:else}
        <span class="status status-dim">Not found</span>
      {/if}
    </div>
    {#if !agentsFolder?.exists}
      <p class="hint">Create a .agents/ folder to define agent configurations and skills.</p>
    {/if}
    {#if agentsFolder?.exists && agentsFolder.entries.length > 0}
      <ul class="file-list">
        {#each agentsFolder.entries as entry (entry)}
          <li class="file-item">{entry}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- .claude/ folder -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">.claude/ folder</span>
      {#if claudeFiles.length > 0}
        <span class="status status-ok">{claudeFiles.length} file{claudeFiles.length === 1 ? '' : 's'}</span>
      {:else}
        <span class="status status-dim">Not found</span>
      {/if}
    </div>
    {#if claudeFiles.length === 0}
      <p class="hint">Add a .claude/ folder with settings and CLAUDE.md for Claude-based agents.</p>
    {/if}
    {#if claudeFiles.length > 0}
      <ul class="file-list">
        {#each claudeFiles as file (file)}
          <li class="file-item">{file}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- AGENTS.md files -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">AGENTS.md files</span>
      {#if agentFiles.length > 0}
        <span class="status status-ok">{agentFiles.length} file{agentFiles.length === 1 ? '' : 's'}</span>
      {:else}
        <span class="status status-dim">Not found</span>
      {/if}
    </div>
    {#if agentFiles.length === 0}
      <p class="hint">Add AGENTS.md files to provide instructions for your agents.</p>
    {/if}
    {#if agentFiles.length > 0}
      <ul class="file-list">
        {#each agentFiles as file (file.path)}
          <li class="file-item">
            <a
              href="/{data.provider}/{data.organization}/{data.repoName}/blob/{data.defaultBranch}/{file.path}"
              class="file-link"
            >{file.path}</a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<!-- AGENTS.md / CLAUDE.md pairs -->
{#if agentPairs.length > 0}
  <h2 class="section-heading pairs-heading">AGENTS.md / CLAUDE.md Pairs</h2>

  <div class="pairs-toolbar">
    <div class="filter-group" role="group" aria-label="Filter by status">
      {#each [['all', 'All'], ['paired', '✓ Paired'], ['missing', '✗ Missing'], ['symlink', '⌘ Symlink']] as [val, label] (val)}
        <button
          class="filter-btn"
          class:active={filterStatus === val}
          onclick={() => { filterStatus = val as FilterStatus; }}
        >{label}</button>
      {/each}
    </div>
    <span class="pair-count">{filteredPairs.length} of {agentPairs.length}</span>
  </div>

  <div class="pairs-table">
    <div class="pairs-head">
      <button class="col-dir sort-btn" onclick={toggleSort} aria-label="Sort by directory">
        Directory {sortDir === 'asc' ? '↑' : '↓'}
      </button>
      <span class="col-agents">AGENTS.md</span>
      <span class="col-claude">CLAUDE.md</span>
      <span class="col-actions">Actions</span>
    </div>

    {#each filteredPairs as pair (pair.agentsPath)}
      <div class="pair-row">
        <span class="col-dir dir-label" title={pair.directory || '(root)'}>
          {pair.directory || '(root)'}
        </span>

        <span class="col-agents">
          {#if pair.isAgentsSymlink}
            <span class="badge badge-symlink" title="Symlink — showing original only">⌘ symlink</span>
          {:else}
            <a
              class="file-link"
              href="/{data.provider}/{data.organization}/{data.repoName}/blob/{data.defaultBranch}/{pair.agentsPath}"
              title={pair.agentsPath}
            >✓</a>
          {/if}
        </span>

        <span class="col-claude">
          {#if pair.isClaudeSymlink}
            <span class="badge badge-symlink" title="Symlink — showing original only">⌘ symlink</span>
          {:else if pair.existsClaude}
            <a
              class="file-link"
              href="/{data.provider}/{data.organization}/{data.repoName}/blob/{data.defaultBranch}/{pair.claudePath}"
              title={pair.claudePath}
            >✓</a>
          {:else}
            <span class="badge badge-missing">✗ missing</span>
          {/if}
        </span>

        <span class="col-actions">
          <button
            class="action-btn"
            onclick={() => openEditor(pair)}
            disabled={loadingPairPath === pair.agentsPath}
            title="Edit both files side by side"
          >
            {loadingPairPath === pair.agentsPath ? '…' : 'Edit'}
          </button>
          {#if !pair.existsClaude && !pair.isClaudeSymlink}
            <button
              class="action-btn action-btn-generate"
              onclick={() => openGenerate(pair)}
              title="Generate a CLAUDE.md from this AGENTS.md"
            >Generate CLAUDE.md</button>
          {/if}
        </span>
      </div>
    {/each}

    {#if filteredPairs.length === 0}
      <div class="pairs-empty">No pairs match the selected filter.</div>
    {/if}
  </div>
{/if}

<!-- Editor overlay -->
{#if editorState}
  <AgentPairEditor
    organization={data.organization}
    repoName={data.repoName}
    agentsPath={editorState.pair.agentsPath}
    claudePath={editorState.pair.claudePath}
    agentsContent={editorState.agentsContent}
    agentsSha={editorState.agentsSha}
    claudeContent={editorState.claudeContent}
    claudeSha={editorState.claudeSha}
    isAgentsSymlink={editorState.pair.isAgentsSymlink}
    isClaudeSymlink={editorState.pair.isClaudeSymlink}
    onclose={closeEditor}
  />
{/if}

<!-- Generate modal -->
{#if generatePair}
  <GenerateClaudeModal
    organization={data.organization}
    repoName={data.repoName}
    agentsPath={generatePair.agentsPath}
    claudePath={generatePair.claudePath}
    onclose={closeGenerate}
  />
{/if}

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

  .pairs-heading {
    margin-top: 24px;
  }

  /* ------------------------------------------------------------------ */
  /* Cards row                                                           */
  /* ------------------------------------------------------------------ */
  .cards-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  /* ------------------------------------------------------------------ */
  /* Card                                                                */
  /* ------------------------------------------------------------------ */
  .card {
    flex: 1;
    min-width: 200px;
    min-height: 80px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 12px 14px;
  }

  .hint {
    font-size: 11px;
    color: var(--color-dim);
    margin: 6px 0 0;
    line-height: 1.4;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .card-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text);
  }

  /* ------------------------------------------------------------------ */
  /* Status indicator                                                    */
  /* ------------------------------------------------------------------ */
  .status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    flex-shrink: 0;
  }

  .status-ok {
    color: var(--color-success);
  }

  .status-dim {
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* File list                                                           */
  /* ------------------------------------------------------------------ */
  .file-list {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-item {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ------------------------------------------------------------------ */
  /* File link                                                           */
  /* ------------------------------------------------------------------ */
  .file-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
  }

  .file-link:hover {
    text-decoration: underline;
  }

  /* ------------------------------------------------------------------ */
  /* Pairs toolbar                                                       */
  /* ------------------------------------------------------------------ */
  .pairs-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .filter-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 9px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
  }

  .filter-btn.active {
    border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
    background: color-mix(in srgb, var(--color-accent) 12%, var(--color-elevated));
    color: var(--color-accent);
  }

  .filter-btn:hover:not(.active) {
    color: var(--color-text);
    border-color: color-mix(in srgb, var(--color-text) 20%, var(--color-border));
  }

  .pair-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Pairs table                                                         */
  /* ------------------------------------------------------------------ */
  .pairs-table {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  .pairs-head,
  .pair-row {
    display: grid;
    grid-template-columns: 1fr 90px 90px 220px;
    align-items: center;
    gap: 0;
  }

  @media (max-width: 700px) {
    .pairs-head,
    .pair-row {
      grid-template-columns: 1fr 70px 70px 1fr;
    }
  }

  .pairs-head {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
  }

  .pairs-head > * {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
    padding: 7px 12px;
  }

  .sort-btn {
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 7px 12px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
  }

  .sort-btn:hover {
    color: var(--color-text);
  }

  .pair-row {
    border-bottom: 1px solid var(--color-border);
  }

  .pair-row:last-child {
    border-bottom: none;
  }

  .pair-row:hover {
    background: color-mix(in srgb, var(--color-accent) 4%, transparent);
  }

  .pair-row > * {
    padding: 8px 12px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
  }

  .dir-label {
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-agents,
  .col-claude {
    display: flex;
    align-items: center;
  }

  .col-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  /* ------------------------------------------------------------------ */
  /* Badges                                                              */
  /* ------------------------------------------------------------------ */
  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    border-radius: 3px;
    padding: 1px 5px;
  }

  .badge-symlink {
    color: var(--color-dim);
    background: color-mix(in srgb, var(--color-dim) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-dim) 20%, transparent);
  }

  .badge-missing {
    color: color-mix(in srgb, var(--color-error, #e55) 80%, var(--color-text));
    background: color-mix(in srgb, var(--color-error, #e55) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error, #e55) 20%, transparent);
  }

  /* ------------------------------------------------------------------ */
  /* Action buttons                                                      */
  /* ------------------------------------------------------------------ */
  .action-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 9px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
    white-space: nowrap;
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .action-btn:not(:disabled):hover {
    color: var(--color-text);
    border-color: color-mix(in srgb, var(--color-text) 20%, var(--color-border));
  }

  .action-btn-generate {
    border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
    color: var(--color-accent);
  }

  .action-btn-generate:hover {
    background: color-mix(in srgb, var(--color-accent) 10%, var(--color-elevated)) !important;
    border-color: var(--color-accent) !important;
    color: var(--color-accent) !important;
  }

  /* ------------------------------------------------------------------ */
  /* Empty state                                                         */
  /* ------------------------------------------------------------------ */
  .pairs-empty {
    font-size: 11px;
    color: var(--color-dim);
    padding: 16px 12px;
    text-align: center;
  }
</style>
