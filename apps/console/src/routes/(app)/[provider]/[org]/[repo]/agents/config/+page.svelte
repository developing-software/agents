<script lang="ts">
  import type { PageProps } from './$types';
  import AgentPairEditor from '$lib/features/agents/components/AgentPairEditor.svelte';
  import GenerateClaudeModal from '$lib/features/agents/components/GenerateClaudeModal.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data }: PageProps = $props();

  const pairs = $derived(data.pairs);
  const agentsFolder = $derived(data.agentsFolder);
  const claudeFiles = $derived(data.claudeFolder);

  let filterText = $state('');
  let statusFilter = $state<'all' | 'paired' | 'missing' | 'symlink'>('all');
  let showSymlinks = $state(false);

  let editor: AgentPairEditor;
  let generateModal: GenerateClaudeModal;

  const filteredPairs = $derived.by(() => {
    let result = pairs;

    if (!showSymlinks) {
      result = result.filter(
        (p) => !(p.agents?.isSymlink || p.claude?.isSymlink),
      );
    }

    if (filterText) {
      const q = filterText.toLowerCase();
      result = result.filter((p) => p.directory.toLowerCase().includes(q));
    }

    if (statusFilter === 'paired') {
      result = result.filter((p) => p.agents && p.claude);
    } else if (statusFilter === 'missing') {
      result = result.filter((p) => !p.agents || !p.claude);
    } else if (statusFilter === 'symlink') {
      result = result.filter((p) => p.agents?.isSymlink || p.claude?.isSymlink);
    }

    return result;
  });

  const stats = $derived.by(() => {
    let paired = 0;
    let missing = 0;
    let symlinked = 0;
    for (const p of pairs) {
      if (p.agents?.isSymlink || p.claude?.isSymlink) symlinked++;
      if (p.agents && p.claude) paired++;
      else missing++;
    }
    return { paired, missing, symlinked, total: pairs.length };
  });

  function pairStatus(pair: (typeof pairs)[number]): 'paired' | 'missing-claude' | 'missing-agents' | 'symlink' {
    if (pair.agents?.isSymlink || pair.claude?.isSymlink) return 'symlink';
    if (pair.agents && pair.claude) return 'paired';
    if (!pair.claude) return 'missing-claude';
    return 'missing-agents';
  }

  function statusIcon(status: ReturnType<typeof pairStatus>): string {
    switch (status) {
      case 'paired': return '✓';
      case 'missing-claude': return '✗';
      case 'missing-agents': return '✗';
      case 'symlink': return '⌘';
    }
  }

  function displayDir(dir: string): string {
    return dir === '.' ? '/' : dir;
  }

  function openEditor(pair: (typeof pairs)[number]) {
    editor.open(pair.directory, {
      hasAgents: !!pair.agents,
      hasClaude: !!pair.claude,
    });
  }

  function openGenerate(dir: string) {
    generateModal.open(dir);
  }

  function onSaved() {
    invalidateAll();
  }

  function onGenerated() {
    invalidateAll();
  }
</script>

<svelte:head>
  <title>Config — {data.organization}/{data.repoName}</title>
</svelte:head>

<!-- Summary cards -->
<h2 class="section-heading">Agent Configuration</h2>

<div class="summary-row">
  <div class="summary-card">
    <span class="summary-value">{stats.total}</span>
    <span class="summary-label">Locations</span>
  </div>
  <div class="summary-card">
    <span class="summary-value paired">{stats.paired}</span>
    <span class="summary-label">Paired</span>
  </div>
  <div class="summary-card">
    <span class="summary-value missing">{stats.missing}</span>
    <span class="summary-label">Missing pair</span>
  </div>
  {#if stats.symlinked > 0}
    <div class="summary-card">
      <span class="summary-value symlink">{stats.symlinked}</span>
      <span class="summary-label">Symlinks</span>
    </div>
  {/if}

  {#if agentsFolder?.exists}
    <div class="summary-card">
      <span class="summary-value">{agentsFolder.entries.length}</span>
      <span class="summary-label">.agents/ entries</span>
    </div>
  {/if}
  {#if claudeFiles.length > 0}
    <div class="summary-card">
      <span class="summary-value">{claudeFiles.length}</span>
      <span class="summary-label">.claude/ files</span>
    </div>
  {/if}
</div>

<!-- Filters -->
<h2 class="section-heading">File Pairs</h2>

<div class="filter-bar">
  <input
    type="text"
    class="filter-input"
    placeholder="Filter by directory..."
    bind:value={filterText}
  />
  <div class="filter-pills">
    <button
      type="button"
      class="pill"
      class:active={statusFilter === 'all'}
      onclick={() => (statusFilter = 'all')}
    >All</button>
    <button
      type="button"
      class="pill"
      class:active={statusFilter === 'paired'}
      onclick={() => (statusFilter = 'paired')}
    >Paired</button>
    <button
      type="button"
      class="pill"
      class:active={statusFilter === 'missing'}
      onclick={() => (statusFilter = 'missing')}
    >Missing</button>
    {#if stats.symlinked > 0}
      <button
        type="button"
        class="pill"
        class:active={statusFilter === 'symlink'}
        onclick={() => (statusFilter = 'symlink')}
      >Symlinks</button>
    {/if}
  </div>
  {#if stats.symlinked > 0}
    <label class="toggle-label">
      <input type="checkbox" bind:checked={showSymlinks} />
      <span>Show symlinks</span>
    </label>
  {/if}
</div>

<!-- Pair table -->
{#if filteredPairs.length === 0}
  <p class="empty-hint">
    {#if pairs.length === 0}
      No AGENTS.md or CLAUDE.md files found. Add them to provide instructions for your agents.
    {:else}
      No results match the current filter.
    {/if}
  </p>
{:else}
  <div class="pair-table">
    <div class="pair-header">
      <span class="col-dir">Directory</span>
      <span class="col-status">Status</span>
      <span class="col-file">AGENTS.md</span>
      <span class="col-file">CLAUDE.md</span>
      <span class="col-actions">Actions</span>
    </div>
    {#each filteredPairs as pair (pair.directory)}
      {@const status = pairStatus(pair)}
      <div class="pair-row" class:symlink-row={status === 'symlink'}>
        <span class="col-dir dir-name">{displayDir(pair.directory)}</span>

        <span class="col-status">
          <span class="status-badge status-{status}" title={status}>
            {statusIcon(status)}
          </span>
        </span>

        <span class="col-file">
          {#if pair.agents}
            <a
              href="/{data.provider}/{data.organization}/{data.repoName}/blob/{data.defaultBranch}/{pair.agents.path}"
              class="file-link"
            >
              {pair.agents.isSymlink ? 'symlink' : 'view'}
            </a>
          {:else}
            <span class="file-absent">—</span>
          {/if}
        </span>

        <span class="col-file">
          {#if pair.claude}
            <a
              href="/{data.provider}/{data.organization}/{data.repoName}/blob/{data.defaultBranch}/{pair.claude.path}"
              class="file-link"
            >
              {pair.claude.isSymlink ? 'symlink' : 'view'}
            </a>
          {:else}
            <span class="file-absent">—</span>
          {/if}
        </span>

        <span class="col-actions">
          {#if pair.agents || pair.claude}
            <button
              type="button"
              class="action-btn"
              onclick={() => openEditor(pair)}
              title="Edit files"
            >Edit</button>
          {/if}
          {#if !pair.claude}
            <button
              type="button"
              class="action-btn action-generate"
              onclick={() => openGenerate(pair.directory)}
              title="Generate CLAUDE.md"
            >+ CLAUDE.md</button>
          {/if}
        </span>
      </div>
    {/each}
  </div>
{/if}

<AgentPairEditor bind:this={editor} onsaved={onSaved} />
<GenerateClaudeModal bind:this={generateModal} ongenerated={onGenerated} />

<style>
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

  /* Summary */
  .summary-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 72px;
    padding: 10px 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
  }

  .summary-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
  }

  .summary-value.paired { color: var(--color-success); }
  .summary-value.missing { color: var(--color-warning, #e8a); }
  .summary-value.symlink { color: var(--color-dim); }

  .summary-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
  }

  /* Filters */
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .filter-input {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 5px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
    width: 200px;
  }

  .filter-pills {
    display: flex;
    gap: 4px;
  }

  .pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 4px 10px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-surface);
    color: var(--color-dim);
    cursor: pointer;
  }

  .pill:hover {
    color: var(--color-text);
  }

  .pill.active {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    cursor: pointer;
    margin-left: auto;
  }

  .toggle-label input {
    accent-color: var(--color-accent);
  }

  .empty-hint {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 16px 0;
  }

  /* Pair table */
  .pair-table {
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  .pair-header {
    display: grid;
    grid-template-columns: 1fr 60px 80px 80px 140px;
    gap: 0;
    padding: 6px 12px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .pair-header span {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
  }

  .pair-row {
    display: grid;
    grid-template-columns: 1fr 60px 80px 80px 140px;
    gap: 0;
    padding: 7px 12px;
    border-bottom: 1px solid var(--color-border);
    align-items: center;
  }

  .pair-row:last-child {
    border-bottom: none;
  }

  .pair-row:hover {
    background: color-mix(in srgb, var(--color-surface) 50%, transparent);
  }

  .symlink-row {
    opacity: 0.55;
  }

  .dir-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-status {
    text-align: center;
  }

  .col-file {
    text-align: center;
  }

  .col-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .status-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 700;
  }

  .status-paired { color: var(--color-success); }
  .status-missing-claude,
  .status-missing-agents { color: var(--color-warning, #e8a); }
  .status-symlink { color: var(--color-dim); }

  .file-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-accent);
    text-decoration: none;
  }

  .file-link:hover {
    text-decoration: underline;
  }

  .file-absent {
    font-size: 10px;
    color: var(--color-dim);
  }

  .action-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    white-space: nowrap;
  }

  .action-btn:hover {
    background: var(--color-bg);
  }

  .action-generate {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .action-generate:hover {
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .pair-header,
    .pair-row {
      grid-template-columns: 1fr 40px 60px 60px auto;
      font-size: 10px;
    }

    .filter-input {
      width: 140px;
    }

    .summary-row {
      gap: 6px;
    }

    .summary-card {
      min-width: 56px;
      padding: 8px 10px;
    }
  }
</style>
