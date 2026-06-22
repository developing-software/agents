<script lang="ts">
  import type { PageProps } from './$types';
  import type { AgentDiscovery } from '@agents/core/agent';
  import AgentPairEditor from '$lib/features/agents/components/AgentPairEditor.svelte';
  import GenerateClaudeModal from '$lib/features/agents/components/GenerateClaudeModal.svelte';

  let { data }: PageProps = $props();

  type Pair = AgentDiscovery.AgentPair;

  const pairs = $derived(data.pairs);
  const agentsFolder = $derived(data.agentsFolder);
  const claudeFiles = $derived(data.claudeFolder);

  // Collapse symlinked entries — show only originals
  const visiblePairs = $derived(pairs.filter((p: Pair) => !p.isAgentsSymlink));

  // Filter/sort state
  let filter = $state<'all' | 'paired' | 'missing'>('all');
  let sortBy = $state<'path' | 'status'>('path');

  const filteredPairs = $derived(() => {
    let result = visiblePairs as Pair[];
    if (filter === 'paired') result = result.filter((p) => p.existsClaude);
    if (filter === 'missing') result = result.filter((p) => !p.existsClaude);
    if (sortBy === 'status') {
      result = [...result].sort((a, b) => {
        if (a.existsClaude === b.existsClaude) return a.agentsPath.localeCompare(b.agentsPath);
        return a.existsClaude ? 1 : -1;
      });
    }
    return result;
  });

  // Inline editor state
  let editingPath = $state<string | null>(null);

  // Generate modal state
  let generatingPath = $state<string | null>(null);

  function blobHref(filePath: string) {
    return `/${data.provider}/${data.organization}/${data.repoName}/blob/${data.defaultBranch}/${filePath}`;
  }

  function pairedCount(ps: Pair[]) {
    return ps.filter((p) => !p.isAgentsSymlink && p.existsClaude).length;
  }
  function missingCount(ps: Pair[]) {
    return ps.filter((p) => !p.isAgentsSymlink && !p.existsClaude).length;
  }
</script>

<svelte:head>
  <title>Config — {data.organization}/{data.repoName}</title>
</svelte:head>

<h2 class="section-heading">Agent Configuration</h2>

<!-- Summary strip -->
<div class="summary-strip">
  <div class="summary-item">
    <span class="summary-val">{visiblePairs.length}</span>
    <span class="summary-key">AGENTS.md</span>
  </div>
  <div class="summary-divider"></div>
  <div class="summary-item">
    <span class="summary-val ok">{pairedCount(pairs)}</span>
    <span class="summary-key">paired</span>
  </div>
  <div class="summary-divider"></div>
  <div class="summary-item">
    <span class="summary-val {missingCount(pairs) > 0 ? 'warn' : 'ok'}">{missingCount(pairs)}</span>
    <span class="summary-key">missing CLAUDE.md</span>
  </div>
  {#if agentsFolder?.exists}
    <div class="summary-divider"></div>
    <div class="summary-item">
      <span class="summary-val">{agentsFolder.entries.length}</span>
      <span class="summary-key">.agents/ entries</span>
    </div>
  {/if}
  {#if claudeFiles.length > 0}
    <div class="summary-divider"></div>
    <div class="summary-item">
      <span class="summary-val">{claudeFiles.length}</span>
      <span class="summary-key">.claude/ files</span>
    </div>
  {/if}
</div>

<!-- Filter/sort toolbar -->
{#if visiblePairs.length > 0}
  <div class="toolbar">
    <div class="filter-group">
      {#each [['all', 'All'], ['paired', 'Paired'], ['missing', 'Missing']] as [val, label] (val)}
        <button
          class="filter-btn"
          class:active={filter === val}
          onclick={() => { filter = val as typeof filter; }}
        >{label}</button>
      {/each}
    </div>
    <div class="sort-group">
      <span class="sort-label">Sort:</span>
      <button class="filter-btn" class:active={sortBy === 'path'} onclick={() => { sortBy = 'path'; }}>Path</button>
      <button class="filter-btn" class:active={sortBy === 'status'} onclick={() => { sortBy = 'status'; }}>Status</button>
    </div>
  </div>
{/if}

<!-- Pairs table -->
{#if visiblePairs.length === 0}
  <div class="empty">
    <p class="empty-text">No AGENTS.md files found in this repository.</p>
    <p class="empty-hint">Create an AGENTS.md at the root or in any subdirectory to get started.</p>
  </div>
{:else}
  <div class="pairs-table">
    <div class="table-head">
      <div class="col-dir">Directory</div>
      <div class="col-status">AGENTS.md</div>
      <div class="col-status">CLAUDE.md</div>
      <div class="col-actions">Actions</div>
    </div>

    {#each filteredPairs() as pair (pair.agentsPath)}
      <div class="table-row" class:row-missing={!pair.existsClaude}>
        <!-- Directory -->
        <div class="col-dir">
          <span class="dir-label">{pair.dir || '/'}</span>
        </div>

        <!-- AGENTS.md status -->
        <div class="col-status">
          <a href={blobHref(pair.agentsPath)} class="file-link" target="_blank" rel="noopener">
            {pair.agentsPath}
          </a>
          {#if pair.isAgentsSymlink}
            <span class="badge badge-symlink">symlink</span>
          {:else}
            <span class="badge badge-ok">✓</span>
          {/if}
        </div>

        <!-- CLAUDE.md status -->
        <div class="col-status">
          {#if pair.existsClaude}
            <a href={blobHref(pair.claudePath)} class="file-link" target="_blank" rel="noopener">
              {pair.claudePath}
            </a>
            {#if pair.isClaudeSymlink}
              <span class="badge badge-symlink">symlink</span>
            {:else}
              <span class="badge badge-ok">✓</span>
            {/if}
          {:else}
            <span class="missing-label">⚠ not found</span>
          {/if}
        </div>

        <!-- Actions -->
        <div class="col-actions">
          <button
            class="action-btn"
            onclick={() => { editingPath = editingPath === pair.agentsPath ? null : pair.agentsPath; }}
          >{editingPath === pair.agentsPath ? 'Close' : 'Edit'}</button>

          {#if !pair.existsClaude}
            <button
              class="action-btn action-btn-accent"
              onclick={() => { generatingPath = pair.agentsPath; }}
            >Generate CLAUDE.md</button>
          {/if}
        </div>
      </div>

      <!-- Inline editor -->
      {#if editingPath === pair.agentsPath}
        <div class="inline-editor-row">
          <AgentPairEditor
            agentsPath={pair.agentsPath}
            onclose={() => { editingPath = null; }}
            onsaved={() => { editingPath = null; }}
          />
        </div>
      {/if}
    {/each}
  </div>
{/if}

<!-- Generate modal -->
{#if generatingPath}
  <GenerateClaudeModal
    agentsPath={generatingPath}
    onclose={() => { generatingPath = null; }}
    ongenerated={() => { generatingPath = null; }}
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
    margin: 0 0 12px;
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
  /* Summary strip                                                       */
  /* ------------------------------------------------------------------ */
  .summary-strip {
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 8px 14px;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .summary-item {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }

  .summary-val {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text);
  }
  .summary-val.ok { color: var(--color-success); }
  .summary-val.warn { color: var(--color-warning, #e8a44a); }

  .summary-key {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .summary-divider {
    width: 1px;
    height: 14px;
    background: var(--color-border);
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Toolbar                                                             */
  /* ------------------------------------------------------------------ */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 6px;
  }

  .filter-group,
  .sort-group {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .sort-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    margin-right: 2px;
  }

  .filter-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 9px;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-dim);
    cursor: pointer;
    line-height: 1.6;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
  }
  .filter-btn:hover { color: var(--color-muted); border-color: var(--color-muted); }
  .filter-btn.active {
    background: var(--color-elevated);
    border-color: var(--color-muted);
    color: var(--color-text);
  }

  /* ------------------------------------------------------------------ */
  /* Empty state                                                         */
  /* ------------------------------------------------------------------ */
  .empty {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 24px 20px;
    text-align: center;
  }

  .empty-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-muted);
    margin: 0 0 6px;
  }

  .empty-hint {
    font-size: 11px;
    color: var(--color-dim);
    margin: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Table                                                               */
  /* ------------------------------------------------------------------ */
  .pairs-table {
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  .table-head {
    display: grid;
    grid-template-columns: 160px 1fr 1fr 180px;
    background: var(--color-elevated);
    border-bottom: 1px solid var(--color-border);
    padding: 6px 12px;
    gap: 12px;
  }

  .table-head > div {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
  }

  .table-row {
    display: grid;
    grid-template-columns: 160px 1fr 1fr 180px;
    padding: 8px 12px;
    gap: 12px;
    align-items: center;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    transition: background 0.1s;
  }
  .table-row:last-of-type { border-bottom: none; }
  .table-row:hover { background: var(--color-elevated); }
  .table-row.row-missing { background: color-mix(in srgb, var(--color-warning, #e8a44a) 4%, var(--color-surface)); }

  .col-dir,
  .col-status,
  .col-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .col-actions { gap: 5px; flex-wrap: wrap; }

  .dir-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .file-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-accent);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-link:hover { text-decoration: underline; }

  .missing-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-warning, #e8a44a);
  }

  /* ------------------------------------------------------------------ */
  /* Badges                                                              */
  /* ------------------------------------------------------------------ */
  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .badge-ok {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .badge-symlink {
    background: var(--color-elevated);
    color: var(--color-dim);
    border: 1px solid var(--color-border);
  }

  /* ------------------------------------------------------------------ */
  /* Action buttons                                                      */
  /* ------------------------------------------------------------------ */
  .action-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 9px;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-muted);
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.1s, border-color 0.1s;
  }
  .action-btn:hover { color: var(--color-text); border-color: var(--color-muted); }

  .action-btn-accent {
    border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
    color: var(--color-accent);
  }
  .action-btn-accent:hover {
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  /* ------------------------------------------------------------------ */
  /* Inline editor row                                                   */
  /* ------------------------------------------------------------------ */
  .inline-editor-row {
    padding: 0 12px 12px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  /* ------------------------------------------------------------------ */
  /* Responsive                                                          */
  /* ------------------------------------------------------------------ */
  @media (max-width: 768px) {
    .table-head,
    .table-row {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto;
    }

    .col-dir { grid-column: 1 / -1; }
    .col-actions { grid-column: 1 / -1; }
  }
</style>
