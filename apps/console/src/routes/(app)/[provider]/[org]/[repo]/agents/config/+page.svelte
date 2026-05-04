<script lang="ts">
  import type { PageProps } from './$types';
  import AgentPairEditor from '$lib/features/agents/components/AgentPairEditor.svelte';
  import GenerateClaudeModal from '$lib/features/agents/components/GenerateClaudeModal.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data }: PageProps = $props();

  const agentsFolder = $derived(data.agentsFolder);
  const claudeFiles = $derived(data.claudeFolder);
  const agentPairs = $derived(data.agentPairs);

  type StatusFilter = 'all' | 'paired' | 'missing' | 'symlink';
  let statusFilter = $state<StatusFilter>('all');
  let searchQuery = $state('');

  type AgentPair = (typeof agentPairs)[number];

  function pairStatus(pair: AgentPair): 'paired' | 'missing-claude' | 'missing-agents' | 'symlink' {
    if (pair.agentsIsSymlink || pair.claudeIsSymlink) return 'symlink';
    if (pair.agentsPath && pair.claudePath) return 'paired';
    if (pair.agentsPath && !pair.claudePath) return 'missing-claude';
    return 'missing-agents';
  }

  const filteredPairs = $derived.by(() => {
    let pairs = agentPairs;

    if (statusFilter === 'paired') {
      pairs = pairs.filter((p) => pairStatus(p) === 'paired');
    } else if (statusFilter === 'missing') {
      pairs = pairs.filter((p) => pairStatus(p) === 'missing-claude' || pairStatus(p) === 'missing-agents');
    } else if (statusFilter === 'symlink') {
      pairs = pairs.filter((p) => pairStatus(p) === 'symlink');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pairs = pairs.filter((p) => p.directory.toLowerCase().includes(q));
    }

    return pairs;
  });

  const stats = $derived({
    total: agentPairs.length,
    paired: agentPairs.filter((p) => pairStatus(p) === 'paired').length,
    missing: agentPairs.filter((p) => pairStatus(p) === 'missing-claude' || pairStatus(p) === 'missing-agents').length,
    symlink: agentPairs.filter((p) => pairStatus(p) === 'symlink').length,
  });

  let editor: AgentPairEditor;
  let generateModal: GenerateClaudeModal;

  function handleEdit(pair: AgentPair) {
    editor.open({
      directory: pair.directory,
      agentsPath: pair.agentsPath,
      claudePath: pair.claudePath,
    });
  }

  function handleGenerate(pair: AgentPair) {
    generateModal.open(pair.directory);
  }

  function handleSaved() {
    invalidateAll();
  }

  function handleGenerated() {
    invalidateAll();
  }
</script>

<svelte:head>
  <title>Config — {data.organization}/{data.repoName}</title>
</svelte:head>

<h2 class="section-heading">Agent Configuration</h2>

<!-- Summary cards -->
<div class="cards-row">
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
</div>

<!-- Agent pairs section -->
<h2 class="section-heading pair-heading">
  Agent Pairs
  <span class="pair-count">{stats.total}</span>
</h2>

{#if agentPairs.length === 0}
  <div class="empty-state">
    <p class="hint">No AGENTS.md or CLAUDE.md files found in this repository.</p>
    <p class="hint">Add AGENTS.md files to provide instructions for your agents.</p>
  </div>
{:else}
  <!-- Toolbar -->
  <div class="toolbar">
    <div class="filter-tabs">
      <button type="button" class="filter-tab" class:filter-active={statusFilter === 'all'} onclick={() => { statusFilter = 'all'; }}>
        All <span class="filter-count">{stats.total}</span>
      </button>
      <button type="button" class="filter-tab" class:filter-active={statusFilter === 'paired'} onclick={() => { statusFilter = 'paired'; }}>
        Paired <span class="filter-count">{stats.paired}</span>
      </button>
      <button type="button" class="filter-tab" class:filter-active={statusFilter === 'missing'} onclick={() => { statusFilter = 'missing'; }}>
        Missing <span class="filter-count">{stats.missing}</span>
      </button>
      {#if stats.symlink > 0}
        <button type="button" class="filter-tab" class:filter-active={statusFilter === 'symlink'} onclick={() => { statusFilter = 'symlink'; }}>
          Symlink <span class="filter-count">{stats.symlink}</span>
        </button>
      {/if}
    </div>

    <input
      type="text"
      class="search-input"
      placeholder="Filter by directory..."
      bind:value={searchQuery}
    />
  </div>

  <!-- Pairs table -->
  <div class="pairs-table">
    <div class="table-header">
      <span class="col-dir">Directory</span>
      <span class="col-status">Status</span>
      <span class="col-agents">AGENTS.md</span>
      <span class="col-claude">CLAUDE.md</span>
      <span class="col-actions">Actions</span>
    </div>

    {#each filteredPairs as pair (pair.directory)}
      {@const status = pairStatus(pair)}
      <div class="table-row" class:row-symlink={status === 'symlink'}>
        <span class="col-dir dir-name">
          {pair.directory || '.'}
        </span>

        <span class="col-status">
          {#if status === 'paired'}
            <span class="badge badge-ok">Paired</span>
          {:else if status === 'missing-claude'}
            <span class="badge badge-warn">CLAUDE.md missing</span>
          {:else if status === 'missing-agents'}
            <span class="badge badge-warn">AGENTS.md missing</span>
          {:else if status === 'symlink'}
            <span class="badge badge-link">Symlink</span>
          {/if}
        </span>

        <span class="col-agents">
          {#if pair.agentsPath}
            <a
              href="/{data.provider}/{data.organization}/{data.repoName}/blob/{data.defaultBranch}/{pair.agentsPath}"
              class="file-link"
            >
              {#if pair.agentsIsSymlink}
                <span class="symlink-icon" title="Symlink">~</span>
              {/if}
              AGENTS.md
            </a>
          {:else}
            <span class="file-absent">—</span>
          {/if}
        </span>

        <span class="col-claude">
          {#if pair.claudePath}
            <a
              href="/{data.provider}/{data.organization}/{data.repoName}/blob/{data.defaultBranch}/{pair.claudePath}"
              class="file-link"
            >
              {#if pair.claudeIsSymlink}
                <span class="symlink-icon" title="Symlink">~</span>
              {/if}
              CLAUDE.md
            </a>
          {:else}
            <span class="file-absent">—</span>
          {/if}
        </span>

        <span class="col-actions">
          {#if status !== 'symlink'}
            {#if pair.agentsPath || pair.claudePath}
              <button type="button" class="action-btn" onclick={() => handleEdit(pair)} title="Edit files">
                Edit
              </button>
            {/if}
            {#if !pair.claudePath}
              <button type="button" class="action-btn action-generate" onclick={() => handleGenerate(pair)} title="Generate CLAUDE.md">
                + CLAUDE.md
              </button>
            {/if}
          {:else}
            {#if pair.symlinkTarget}
              <span class="symlink-target" title="Symlink target">&rarr; {pair.symlinkTarget}</span>
            {/if}
          {/if}
        </span>
      </div>
    {/each}

    {#if filteredPairs.length === 0}
      <div class="table-empty">No pairs match the current filter.</div>
    {/if}
  </div>
{/if}

<AgentPairEditor bind:this={editor} onsaved={handleSaved} />
<GenerateClaudeModal bind:this={generateModal} ongenerated={handleGenerated} />

<style>
  /* ── Heading ─────────────────────────────────────────────────────── */
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

  .pair-heading {
    margin-top: 20px;
  }

  .pair-count {
    font-size: 10px;
    color: var(--color-muted);
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    padding: 0 5px;
    border-radius: 3px;
    line-height: 1.6;
  }

  /* ── Summary cards ───────────────────────────────────────────────── */
  .cards-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .card {
    flex: 1;
    min-width: 0;
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

  .status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    flex-shrink: 0;
  }

  .status-ok { color: var(--color-success); }
  .status-dim { color: var(--color-dim); }

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

  /* ── Toolbar ─────────────────────────────────────────────────────── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .filter-tabs {
    display: flex;
    gap: 2px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px;
  }

  .filter-tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 3px;
    border: none;
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    line-height: 1.6;
    transition: color 0.1s, background 0.1s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .filter-tab:hover { color: var(--color-muted); }
  .filter-active { background: var(--color-surface); color: var(--color-text); }

  .filter-count {
    font-size: 9px;
    color: var(--color-dim);
    background: var(--color-surface);
    border-radius: 3px;
    padding: 0 3px;
    line-height: 1.5;
  }
  .filter-active .filter-count {
    background: var(--color-elevated);
  }

  .search-input {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
    outline: none;
    flex: 1;
    max-width: 240px;
    transition: border-color 0.1s;
  }
  .search-input:focus { border-color: var(--color-accent); }
  .search-input::placeholder { color: var(--color-dim); }

  /* ── Pairs table ─────────────────────────────────────────────────── */
  .pairs-table {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  .table-header {
    display: grid;
    grid-template-columns: 1fr 130px 100px 100px 160px;
    gap: 8px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
  }

  .table-header span {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .table-row {
    display: grid;
    grid-template-columns: 1fr 130px 100px 100px 160px;
    gap: 8px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--color-border);
    align-items: center;
    transition: background 0.1s;
  }
  .table-row:last-child { border-bottom: none; }
  .table-row:hover { background: var(--color-hover); }

  .row-symlink {
    opacity: 0.6;
  }

  .dir-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Status badges ───────────────────────────────────────────────── */
  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    line-height: 1;
    white-space: nowrap;
  }

  .badge-ok {
    color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
  }

  .badge-warn {
    color: var(--color-warning, #e5a100);
    background: color-mix(in srgb, var(--color-warning, #e5a100) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-warning, #e5a100) 25%, transparent);
  }

  .badge-link {
    color: var(--color-muted);
    background: color-mix(in srgb, var(--color-muted) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-muted) 20%, transparent);
  }

  /* ── File links ──────────────────────────────────────────────────── */
  .file-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .file-link:hover { text-decoration: underline; }

  .file-absent {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  .symlink-icon {
    font-size: 10px;
    color: var(--color-dim);
  }

  .symlink-target {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Action buttons ──────────────────────────────────────────────── */
  .col-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    white-space: nowrap;
  }
  .action-btn:hover {
    background: var(--color-hover);
    border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
  }

  .action-generate {
    color: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
  }
  .action-generate:hover {
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }

  .table-empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 20px 14px;
    text-align: center;
  }

  .empty-state {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 20px;
    text-align: center;
  }

  /* ── Responsive ──────────────────────────────────────────────────── */
  @media (max-width: 800px) {
    .cards-row {
      flex-direction: column;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input {
      max-width: none;
    }

    .table-header {
      display: none;
    }

    .table-row {
      grid-template-columns: 1fr;
      gap: 4px;
      padding: 10px 14px;
    }

    .col-status { order: -1; }
    .col-actions { margin-top: 4px; }
  }
</style>
