<script lang="ts">
  import type { PageProps } from './$types';
  import type { AgentDiscovery } from '@agents/core/agent';
  import ConfigPairEditor from '$lib/features/agents/config/ConfigPairEditor.svelte';
  import GenerateClaudeModal from '$lib/features/agents/config/GenerateClaudeModal.svelte';
  import {
    filterAndSortPairs,
    hasSymlinks,
    statusIcon,
    statusLabel,
    type ConfigSortMode,
    type ConfigStatusFilter,
  } from '$lib/features/agents/config/page';

  let { data }: PageProps = $props();

  type Pair = AgentDiscovery.ConfigPair;

  let search = $state('');
  let statusFilter = $state<ConfigStatusFilter>('all');
  let sortMode = $state<ConfigSortMode>('directory');
  let selectedPair = $state<Pair | null>(null);
  let editorOpen = $state(false);
  let generatorOpen = $state(false);

  function fileUrl(path: string): string {
    return `/${data.provider}/${data.organization}/${data.repoName}/blob/${data.defaultBranch}/${path}`;
  }

  const visiblePairs = $derived.by(() => {
    return filterAndSortPairs({
      pairs: data.configPairs,
      search,
      statusFilter,
      sortMode,
    });
  });

  function openEditor(pair: Pair) {
    selectedPair = pair;
    editorOpen = true;
  }

  function openGenerator(pair: Pair) {
    selectedPair = pair;
    generatorOpen = true;
  }
</script>

<svelte:head>
  <title>Config — {data.organization}/{data.repoName}</title>
</svelte:head>

<div class="page">
  <header class="header">
    <div>
      <h2>Agent Config Pairs</h2>
      <p>Match AGENTS.md and CLAUDE.md by directory, collapse symlinked copies, and edit the original files.</p>
    </div>

    <div class="summary">
      <span>{data.configPairs.length} scope{data.configPairs.length === 1 ? '' : 's'}</span>
      <span>{data.configPairs.filter((pair) => pair.status === 'paired').length} paired</span>
      <span>{data.configPairs.filter((pair) => pair.status === 'missing_claude').length} missing</span>
    </div>
  </header>

  <section class="controls">
    <input bind:value={search} type="search" placeholder="Filter by directory or path" />

    <select bind:value={statusFilter}>
      <option value="all">All statuses</option>
      <option value="paired">Paired</option>
      <option value="missing">Missing CLAUDE.md</option>
      <option value="symlinked">Symlinked</option>
    </select>

    <select bind:value={sortMode}>
      <option value="directory">Sort by directory</option>
      <option value="status">Sort by status</option>
    </select>
  </section>

  {#if visiblePairs.length === 0}
    <div class="empty">No AGENTS.md scopes matched the current filters.</div>
  {:else}
    <section class="table" aria-label="Agent config pairs">
      <div class="row row-head">
        <span>Scope</span>
        <span>Status</span>
        <span>Files</span>
        <span>Actions</span>
      </div>

      {#each visiblePairs as pair (pair.agents.path)}
        <article class="row">
          <div class="scope">
            <strong>{pair.directory || '.'}</strong>
            <code>{pair.agents.path}</code>
            {#if pair.aliases.length > 0}
              <div class="aliases">
                {#each pair.aliases as alias (alias.kind + alias.path)}
                  <span>⌘ {alias.path} -> {alias.canonicalPath}</span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="status-cell">
            <span class="status" class:status-missing={pair.status === 'missing_claude'} class:status-ok={pair.status === 'paired'}>
              {statusIcon(pair)} {statusLabel(pair)}
            </span>
          </div>

          <div class="files">
            <a class="file-link" href={fileUrl(pair.agents.path)}>AGENTS.md</a>
            {#if pair.claude}
              <a class="file-link" href={fileUrl(pair.claude.path)}>CLAUDE.md</a>
            {:else}
              <span class="file-missing">CLAUDE.md missing</span>
            {/if}
          </div>

          <div class="actions">
            <button type="button" class="ghost" onclick={() => openEditor(pair)}>Edit</button>
            {#if !pair.claude}
              <button type="button" class="primary" onclick={() => openGenerator(pair)}>Generate</button>
            {/if}
          </div>
        </article>
      {/each}
    </section>
  {/if}
</div>

<ConfigPairEditor
  bind:open={editorOpen}
  pair={selectedPair}
  organization={data.organization}
  repoName={data.repoName}
/>

<GenerateClaudeModal
  bind:open={generatorOpen}
  pair={selectedPair}
  organization={data.organization}
  repoName={data.repoName}
/>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 14px;
    color: var(--color-text);
  }

  .header p {
    margin: 6px 0 0;
    max-width: 680px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-muted);
  }

  .summary {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .summary span,
  .status,
  .file-link,
  .file-missing,
  code,
  .aliases span,
  .actions button,
  select,
  input {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }

  .summary span,
  .status,
  .file-missing {
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
  }

  .controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
  }

  input,
  select {
    min-width: 0;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
    color: var(--color-text);
    padding: 8px 10px;
    outline: none;
  }

  .table {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(140px, 0.8fr) minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .row:last-child {
    border-bottom: none;
  }

  .row-head {
    background: var(--color-elevated);
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
  }

  .scope,
  .files,
  .actions,
  .status-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .scope strong {
    font-size: 12px;
    color: var(--color-text);
  }

  code {
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .aliases {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .aliases span {
    color: var(--color-warning);
  }

  .status-ok {
    color: var(--color-success);
    border-color: color-mix(in srgb, var(--color-success) 25%, var(--color-border));
    background: var(--color-success-dim);
  }

  .status-missing {
    color: var(--color-warning);
    border-color: color-mix(in srgb, var(--color-warning) 25%, var(--color-border));
    background: var(--color-warning-dim);
  }

  .file-link {
    color: var(--color-accent);
    text-decoration: none;
  }

  .file-link:hover {
    text-decoration: underline;
  }

  .file-missing {
    color: var(--color-warning);
  }

  .actions {
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
  }

  .actions button {
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 5px 10px;
    cursor: pointer;
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .actions .primary {
    background: color-mix(in srgb, var(--color-accent) 16%, transparent);
    border-color: color-mix(in srgb, var(--color-accent) 32%, var(--color-border));
    color: var(--color-accent);
  }

  .empty {
    border: 1px dashed var(--color-border);
    border-radius: 4px;
    padding: 16px;
    color: var(--color-muted);
    text-align: center;
  }

  @media (max-width: 960px) {
    .header {
      flex-direction: column;
    }

    .controls {
      grid-template-columns: minmax(0, 1fr);
    }

    .row {
      grid-template-columns: minmax(0, 1fr);
    }

    .row-head {
      display: none;
    }

    .actions {
      justify-content: flex-start;
    }
  }
</style>
