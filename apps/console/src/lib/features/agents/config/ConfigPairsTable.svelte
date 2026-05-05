<script lang="ts">
  import type { AgentDiscovery } from '@agents/core/agent';
  import {
    describeConfigFile,
    filterAndSortConfigPairs,
    formatDirectoryLabel,
    getConfigPairStatus,
    type ConfigPairFilter,
    type ConfigPairSort,
  } from './helpers';

  let {
    pairs,
    provider,
    organization,
    repoName,
    defaultBranch,
    onedit,
    ongenerate,
  }: {
    pairs: AgentDiscovery.ConfigPair[];
    provider: string;
    organization: string;
    repoName: string;
    defaultBranch: string;
    onedit?: (pair: AgentDiscovery.ConfigPair) => void;
    ongenerate?: (pair: AgentDiscovery.ConfigPair) => void;
  } = $props();

  let search = $state('');
  let filter = $state<ConfigPairFilter>('all');
  let sort = $state<ConfigPairSort>('path');

  const filteredPairs = $derived(filterAndSortConfigPairs(pairs, { search, filter, sort }));
  const pairedCount = $derived(pairs.filter((pair) => pair.status === 'paired').length);
  const missingClaudeCount = $derived(pairs.filter((pair) => pair.status === 'missing_claude').length);
  const missingAgentsCount = $derived(pairs.filter((pair) => pair.status === 'missing_agents').length);
  const symlinkCount = $derived(pairs.filter((pair) => pair.hasSymlink).length);

  function blobHref(path: string): string {
    return `/${provider}/${organization}/${repoName}/blob/${defaultBranch}/${path}`;
  }
</script>

<div class="summary-grid">
  <div class="summary-card">
    <span class="summary-label">Directories</span>
    <span class="summary-value">{pairs.length}</span>
  </div>
  <div class="summary-card">
    <span class="summary-label">Paired</span>
    <span class="summary-value summary-success">{pairedCount}</span>
  </div>
  <div class="summary-card">
    <span class="summary-label">Missing CLAUDE</span>
    <span class="summary-value summary-warning">{missingClaudeCount}</span>
  </div>
  <div class="summary-card">
    <span class="summary-label">Missing AGENTS</span>
    <span class="summary-value summary-danger">{missingAgentsCount}</span>
  </div>
  <div class="summary-card">
    <span class="summary-label">Symlinks</span>
    <span class="summary-value summary-warning">{symlinkCount}</span>
  </div>
</div>

<div class="toolbar">
  <input
    type="search"
    class="search"
    bind:value={search}
    placeholder="Filter by directory, file, or status"
    aria-label="Filter config pairs"
  />

  <div class="toolbar-group">
    <label class="toolbar-label" for="config-filter">Status</label>
    <select id="config-filter" bind:value={filter}>
      <option value="all">all</option>
      <option value="paired">paired</option>
      <option value="missing_claude">missing CLAUDE</option>
      <option value="missing_agents">missing AGENTS</option>
      <option value="symlink">symlinks</option>
    </select>
  </div>

  <div class="toolbar-group">
    <label class="toolbar-label" for="config-sort">Sort</label>
    <select id="config-sort" bind:value={sort}>
      <option value="path">path</option>
      <option value="status">status</option>
    </select>
  </div>
</div>

{#if filteredPairs.length === 0}
  <div class="empty-state">No config pairs matched the current filters.</div>
{:else}
  <div class="list" role="table" aria-label="Agent config pairs">
    <div class="header-row" role="row">
      <span role="columnheader">Directory</span>
      <span role="columnheader">Files</span>
      <span role="columnheader">Status</span>
      <span role="columnheader">Actions</span>
    </div>

    {#each filteredPairs as pair (pair.directory || pair.agents?.path || pair.claude?.path)}
      {@const status = getConfigPairStatus(pair)}
      <div class="row" role="row">
        <div class="directory-cell" role="cell">
          <div class="directory-label">{formatDirectoryLabel(pair.directory)}</div>
          <div class="directory-path mono">
            {pair.directory || '/'}
          </div>
        </div>

        <div class="files-cell" role="cell">
          <div class="file-item">
            {#if pair.agents}
              <a href={blobHref(pair.agents.originalPath)} class="file-link">AGENTS.md</a>
              <span class="file-meta">{describeConfigFile(pair.agents)}</span>
            {:else}
              <span class="file-missing">AGENTS.md missing</span>
            {/if}
          </div>

          <div class="file-item">
            {#if pair.claude}
              <a href={blobHref(pair.claude.originalPath)} class="file-link">CLAUDE.md</a>
              <span class="file-meta">{describeConfigFile(pair.claude)}</span>
            {:else}
              <span class="file-missing">CLAUDE.md missing</span>
            {/if}
          </div>
        </div>

        <div class="status-cell" role="cell">
          <span class={`status-pill status-${status.tone}`}>
            <span class="status-icon">{status.icon}</span>
            <span>{status.label}</span>
          </span>
        </div>

        <div class="actions-cell" role="cell">
          <button type="button" class="action-btn" onclick={() => onedit?.(pair)}>Edit</button>
          {#if pair.status === 'missing_claude' && pair.agents}
            <button type="button" class="action-btn action-btn-accent" onclick={() => ongenerate?.(pair)}>
              Generate CLAUDE.md
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  .summary-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .summary-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .summary-value {
    font-family: var(--font-mono);
    font-size: 18px;
    color: var(--color-text);
  }

  .summary-success {
    color: var(--color-success);
  }

  .summary-warning {
    color: var(--color-warning);
  }

  .summary-danger {
    color: var(--color-danger);
  }

  .toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    margin-bottom: 12px;
    align-items: end;
  }

  .search {
    width: 100%;
  }

  .toolbar-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toolbar-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .empty-state {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-dim);
    padding: 16px;
  }

  .list {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
    background: var(--color-surface);
  }

  .header-row,
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.8fr) minmax(0, 0.9fr) auto;
    gap: 12px;
    padding: 10px 12px;
    align-items: start;
  }

  .header-row {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .row + .row {
    border-top: 1px solid var(--color-border);
  }

  .directory-cell,
  .files-cell,
  .status-cell,
  .actions-cell {
    min-width: 0;
  }

  .directory-label {
    font-size: 13px;
    color: var(--color-text);
  }

  .directory-path {
    margin-top: 4px;
    font-size: 11px;
    color: var(--color-dim);
  }

  .files-cell {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .file-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-link {
    color: var(--color-accent);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .file-link:hover {
    text-decoration: underline;
  }

  .file-meta,
  .file-missing {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-dim);
    word-break: break-word;
  }

  .file-missing {
    color: var(--color-warning);
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 10px;
    border: 1px solid var(--color-border);
  }

  .status-success {
    color: var(--color-success);
    background: var(--color-success-dim);
  }

  .status-warning {
    color: var(--color-warning);
    background: var(--color-warning-dim);
  }

  .status-danger {
    color: var(--color-danger);
    background: var(--color-danger-dim);
  }

  .status-icon {
    font-size: 11px;
  }

  .actions-cell {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }

  .action-btn {
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
    border-radius: 4px;
    padding: 5px 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s;
  }

  .action-btn:hover {
    border-color: var(--color-border-bright);
    background: var(--color-hover);
  }

  .action-btn-accent {
    border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-border));
    color: var(--color-accent);
  }

  @media (max-width: 820px) {
    .toolbar {
      grid-template-columns: 1fr;
    }

    .header-row {
      display: none;
    }

    .row {
      grid-template-columns: 1fr;
    }

    .actions-cell {
      justify-content: flex-start;
    }
  }
</style>
