<script lang="ts">
  import type { PageProps } from "./$types";
  import AgentPairEditor from "$lib/features/agents/config/AgentPairEditor.svelte";
  import GenerateClaudeModal from "$lib/features/agents/config/GenerateClaudeModal.svelte";
  import { listAgentConfigPairs } from "$lib/features/agents/api/config.remote";

  type AgentPair = import("@agents/core/agent").AgentDiscovery.AgentPair;

  let { data }: PageProps = $props();

  let pairOverride = $state<AgentPair[] | null>(null);
  let selectedPair = $state<AgentPair | null>(null);
  let editorOpen = $state(false);
  let generateOpen = $state(false);
  let search = $state("");
  let statusFilter = $state<"all" | "paired" | "missing" | "symlink">("all");
  let sortBy = $state<"path" | "status">("path");
  let refreshing = $state(false);

  const pairs = $derived(pairOverride ?? data.pairs);

  const stats = $derived({
    total: pairs.length,
    paired: pairs.filter((pair) => pair.status === "paired").length,
    missing: pairs.filter((pair) => pair.status === "missing_claude").length,
    symlink: pairs.filter((pair) => pair.hasSymlink).length,
  });

  function matchesFilter(pair: AgentPair) {
    if (statusFilter === "all") return true;
    if (statusFilter === "paired") return pair.status === "paired";
    if (statusFilter === "missing") return pair.status === "missing_claude";
    return pair.hasSymlink;
  }

  function comparePairs(left: AgentPair, right: AgentPair) {
    if (sortBy === "status") {
      const leftRank = left.status === "paired" ? 0 : 1;
      const rightRank = right.status === "paired" ? 0 : 1;
      if (leftRank !== rightRank) return leftRank - rightRank;
    }
    return left.agents.path.localeCompare(right.agents.path);
  }

  const filteredPairs = $derived.by(() => {
    const query = search.trim().toLowerCase();
    return [...pairs]
      .filter((pair) => matchesFilter(pair))
      .filter((pair) => {
        if (!query) return true;
        const haystack = [
          pair.directory,
          pair.agents.path,
          pair.claude?.path ?? "",
          pair.status,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort(comparePairs);
  });

  function blobHref(filePath: string) {
    return `/${data.provider}/${data.organization}/${data.repoName}/blob/${data.defaultBranch}/${filePath}`;
  }

  function statusLabel(pair: AgentPair) {
    return pair.status === "paired" ? "PAIRED" : "MISSING CLAUDE";
  }

  function symlinkSummary(pair: AgentPair) {
    if (pair.claude?.isSymlink) {
      return `CLAUDE symlink${pair.claude.resolvedPath ? ` -> ${pair.claude.resolvedPath}` : ""}`;
    }
    if (pair.agents.isSymlink) {
      return `AGENTS symlink${pair.agents.resolvedPath ? ` -> ${pair.agents.resolvedPath}` : ""}`;
    }
    if (pair.hiddenSymlinkPaths.length > 0) {
      return `${pair.hiddenSymlinkPaths.length} hidden linked ${pair.hiddenSymlinkPaths.length === 1 ? "copy" : "copies"}`;
    }
    return null;
  }

  async function refreshPairs() {
    refreshing = true;
    try {
      const nextPairs = await listAgentConfigPairs({
        organization: data.organization,
        repoName: data.repoName,
      });
      pairOverride = nextPairs;
      if (selectedPair) {
        selectedPair = nextPairs.find((pair) => pair.agents.path === selectedPair?.agents.path) ?? null;
      }
    } finally {
      refreshing = false;
    }
  }

  function openEditor(pair: AgentPair) {
    selectedPair = pair;
    editorOpen = true;
  }

  function openGenerate(pair: AgentPair) {
    selectedPair = pair;
    generateOpen = true;
  }
</script>

<svelte:head>
  <title>Config — {data.organization}/{data.repoName}</title>
</svelte:head>

<section class="page-header">
  <div>
    <span class="eyebrow">Agent Config</span>
    <h2>Paired AGENTS.md / CLAUDE.md</h2>
    <p>
      Review directory-local agent guidance, collapse symlinked copies into their originals, and
      edit both files from one place.
    </p>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <span>Total</span>
      <strong>{stats.total}</strong>
    </div>
    <div class="stat-card">
      <span>Paired</span>
      <strong>{stats.paired}</strong>
    </div>
    <div class="stat-card">
      <span>Missing</span>
      <strong>{stats.missing}</strong>
    </div>
    <div class="stat-card">
      <span>Symlinks</span>
      <strong>{stats.symlink}</strong>
    </div>
  </div>
</section>

<section class="controls">
  <input bind:value={search} class="search-input" type="search" placeholder="Filter by directory or file path" />

  <div class="control-group">
    {#if refreshing}
      <span class="refresh-note">Refreshing...</span>
    {/if}

    <label>
      <span>Status</span>
      <select bind:value={statusFilter}>
        <option value="all">All</option>
        <option value="paired">Paired</option>
        <option value="missing">Missing CLAUDE</option>
        <option value="symlink">Symlinked</option>
      </select>
    </label>

    <label>
      <span>Sort</span>
      <select bind:value={sortBy}>
        <option value="path">Directory</option>
        <option value="status">Status</option>
      </select>
    </label>
  </div>
</section>

{#if filteredPairs.length === 0}
  <div class="empty-state">
    {#if pairs.length === 0}
      No AGENTS.md files were found in this repository.
    {:else}
      No config pairs match the current filters.
    {/if}
  </div>
{:else}
  <section class="pair-table" aria-label="Agent config pairs">
    <div class="table-head">
      <span>Directory</span>
      <span>Files</span>
      <span>Status</span>
      <span>Actions</span>
    </div>

    {#each filteredPairs as pair (pair.agents.path)}
      <article class="pair-row">
        <div class="cell directory-cell">
          <span class="directory-name">{pair.directory || "/"}</span>
          <span class="directory-path">{pair.agents.path}</span>
          {#if symlinkSummary(pair)}
            <span class="directory-note">{symlinkSummary(pair)}</span>
          {/if}
        </div>

        <div class="cell links-cell">
          <a class="file-link" href={blobHref(pair.agents.path)}>AGENTS.md</a>
          {#if pair.claude}
            <a class="file-link" href={blobHref(pair.claude.path)}>CLAUDE.md</a>
          {:else}
            <span class="missing-link">CLAUDE.md missing</span>
          {/if}
        </div>

        <div class="cell status-cell">
          <span class:status-paired={pair.status === "paired"} class="status-pill">
            {statusLabel(pair)}
          </span>
          {#if pair.hasSymlink}
            <span class="symlink-pill">LINKED</span>
          {/if}
        </div>

        <div class="cell actions-cell">
          <button type="button" class="ghost-btn" onclick={() => openEditor(pair)}>
            Edit
          </button>
          {#if !pair.claude}
            <button type="button" class="primary-btn" onclick={() => openGenerate(pair)}>
              Generate
            </button>
          {/if}
        </div>
      </article>
    {/each}
  </section>
{/if}

<AgentPairEditor
  bind:open={editorOpen}
  pair={selectedPair}
  organization={data.organization}
  repoName={data.repoName}
  onupdated={refreshPairs}
/>

<GenerateClaudeModal
  bind:open={generateOpen}
  pair={selectedPair}
  organization={data.organization}
  repoName={data.repoName}
  ongenerated={refreshPairs}
/>

<style>
  .page-header {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  .eyebrow,
  .directory-name,
  .directory-path,
  .directory-note,
  .file-link,
  .missing-link,
  .status-pill,
  .symlink-pill,
  .ghost-btn,
  .primary-btn,
  .table-head,
  .stat-card span,
  .stat-card strong,
  .control-group span,
  select {
    font-family: "JetBrains Mono", monospace;
  }

  .eyebrow {
    display: inline-block;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-accent);
    margin-bottom: 6px;
  }

  .page-header h2 {
    margin: 0;
    font-size: 22px;
    color: var(--color-text);
  }

  .page-header p {
    margin: 8px 0 0;
    max-width: 60ch;
    color: var(--color-muted);
    line-height: 1.6;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .stat-card,
  .controls,
  .pair-table,
  .empty-state {
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-surface);
  }

  .stat-card {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .stat-card span {
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .stat-card strong {
    font-size: 20px;
    color: var(--color-text);
    font-weight: 600;
  }

  .controls {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    justify-content: space-between;
    padding: 12px;
    margin-bottom: 14px;
  }

  .search-input,
  select {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .search-input {
    width: min(440px, 100%);
    padding: 8px 10px;
    font-size: 13px;
  }

  .control-group {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .refresh-note {
    align-self: flex-end;
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .control-group label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .control-group span {
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  select {
    min-width: 150px;
    padding: 8px 10px;
    font-size: 11px;
  }

  .pair-table {
    overflow: hidden;
  }

  .table-head,
  .pair-row {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(140px, 0.5fr) minmax(150px, 0.4fr);
    gap: 12px;
    align-items: center;
  }

  .table-head {
    padding: 10px 14px;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-dim);
    background: color-mix(in srgb, var(--color-elevated) 82%, transparent);
    border-bottom: 1px solid var(--color-border);
  }

  .pair-row + .pair-row {
    border-top: 1px solid var(--color-border);
  }

  .pair-row {
    padding: 14px;
  }

  .cell {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .directory-name {
    font-size: 12px;
    color: var(--color-text);
  }

  .directory-path,
  .directory-note,
  .missing-link {
    font-size: 10px;
    color: var(--color-dim);
  }

  .directory-note {
    color: var(--color-warning);
  }

  .links-cell {
    gap: 8px;
  }

  .file-link,
  .missing-link {
    font-size: 11px;
  }

  .file-link {
    color: var(--color-accent);
    text-decoration: none;
  }

  .file-link:hover {
    text-decoration: underline;
  }

  .status-cell {
    align-items: flex-start;
    gap: 8px;
  }

  .status-pill,
  .symlink-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .status-pill {
    color: var(--color-warning);
    background: color-mix(in srgb, var(--color-warning) 12%, transparent);
  }

  .status-paired {
    color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
  }

  .symlink-pill {
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }

  .actions-cell {
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
  }

  .ghost-btn,
  .primary-btn {
    padding: 6px 10px;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .primary-btn {
    border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
    background: color-mix(in srgb, var(--color-accent) 18%, var(--color-elevated));
    color: var(--color-accent);
  }

  .empty-state {
    padding: 28px;
    text-align: center;
    color: var(--color-dim);
  }

  @media (max-width: 980px) {
    .page-header {
      grid-template-columns: 1fr;
    }

    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input {
      width: 100%;
    }

    .control-group {
      justify-content: flex-start;
    }

    .table-head {
      display: none;
    }

    .pair-row {
      grid-template-columns: 1fr;
    }

    .actions-cell {
      justify-content: flex-start;
    }
  }
</style>
