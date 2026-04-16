<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  let search = $state('');
  let selectedProvider = $state('');
  let page = $state(1);
  let activeFilters = new SvelteSet<string>();

  const PAGE_SIZE = 50;

  const capabilityFilters = [
    { key: 'reasoning', label: 'Reasoning' },
    { key: 'tool_call', label: 'Tool Use' },
    { key: 'structured_output', label: 'Structured Output' },
    { key: 'open_weights', label: 'Open Weights' },
    { key: 'vision', label: 'Vision' },
  ] as const;

  function toggleFilter(key: string) {
    if (activeFilters.has(key)) {
      activeFilters.delete(key);
    } else {
      activeFilters.add(key);
    }
    page = 1;
  }

  function hasVision(model: (typeof data.models)[number]): boolean {
    return model.modalities?.input?.includes('image') ?? false;
  }

  function matchesCapability(model: (typeof data.models)[number], key: string): boolean {
    if (key === 'vision') return hasVision(model);
    return !!(model as Record<string, unknown>)[key];
  }

  const filtered = $derived.by(() => {
    const q = search.toLowerCase().trim();
    return data.models.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q) && !(m.family ?? '').toLowerCase().includes(q) && !m.providerName.toLowerCase().includes(q)) {
        return false;
      }
      if (selectedProvider && m.providerId !== selectedProvider) {
        return false;
      }
      for (const key of activeFilters) {
        if (!matchesCapability(m, key)) return false;
      }
      return true;
    });
  });

  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));

  const safeCurrentPage = $derived(Math.min(page, totalPages));

  const paginated = $derived(
    filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE)
  );

  const rangeStart = $derived(filtered.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1);
  const rangeEnd = $derived(Math.min(safeCurrentPage * PAGE_SIZE, filtered.length));

  function formatTokens(n: number | undefined): string {
    if (n == null || n === 0) return '\u2014';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
    return n.toString();
  }

  function formatCost(n: number | undefined): string {
    if (n == null) return '\u2014';
    return `$${n.toFixed(2)}`;
  }

  function handleSearchInput(e: Event) {
    search = (e.target as HTMLInputElement).value;
    page = 1;
  }

  function handleProviderChange(e: Event) {
    selectedProvider = (e.target as HTMLSelectElement).value;
    page = 1;
  }

  const sortedProviders = $derived(
    [...data.providers].sort((a, b) => a.name.localeCompare(b.name))
  );
</script>

<svelte:head>
  <title>Models</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-text">
      <p class="eyebrow">catalog</p>
      <h1>Models</h1>
      <p class="muted">
        {data.models.length} models · {data.providers.length} providers
      </p>
    </div>
    <input
      type="text"
      placeholder="Search models..."
      value={search}
      oninput={handleSearchInput}
      class="search-input"
    />
  </header>

  <div class="toolbar">
    <div class="capability-filters">
      {#each capabilityFilters as cap (cap.key)}
        <button
          type="button"
          class="filter-pill"
          class:filter-pill-active={activeFilters.has(cap.key)}
          onclick={() => toggleFilter(cap.key)}
        >
          {cap.label}
        </button>
      {/each}
    </div>

    <select
      class="provider-select"
      value={selectedProvider}
      onchange={handleProviderChange}
    >
      <option value="">All providers ({data.providers.length})</option>
      {#each sortedProviders as provider (provider.id)}
        <option value={provider.id}>{provider.name} ({provider.modelCount})</option>
      {/each}
    </select>
  </div>

  {#if filtered.length === 0}
    <div class="empty-state">
      <p>No models match your filters.</p>
    </div>
  {:else}
    <div class="table-wrapper">
      <div class="table-header">
        <span class="col-provider">Provider</span>
        <span class="col-model">Model</span>
        <span class="col-family">Family</span>
        <span class="col-context">Context</span>
        <span class="col-cost">Cost · 1M tokens</span>
        <span class="col-caps">Capabilities</span>
      </div>

      <div class="table-body">
        {#each paginated as model (model.id + model.providerId)}
          <div class="table-row">
            <span class="col-provider">
              <img
                src="https://models.dev/logos/{model.providerId}.svg"
                alt=""
                width="14"
                height="14"
                class="provider-logo"
                onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <span class="provider-name">{model.providerName}</span>
            </span>

            <span class="col-model model-name">{model.name}</span>

            <span class="col-family family-text">{model.family ?? '\u2014'}</span>

            <span class="col-context context-text">{formatTokens(model.limit?.context)}</span>

            <span class="col-cost cost-text">
              {formatCost(model.cost?.input)} / {formatCost(model.cost?.output)}
            </span>

            <span class="col-caps">
              {#if model.reasoning}
                <span class="cap-badge cap-reasoning" title="Reasoning">R</span>
              {/if}
              {#if model.tool_call}
                <span class="cap-badge cap-tool" title="Tool Use">T</span>
              {/if}
              {#if model.structured_output}
                <span class="cap-badge cap-struct" title="Structured Output">S</span>
              {/if}
              {#if model.open_weights}
                <span class="cap-badge cap-open" title="Open Weights">O</span>
              {/if}
              {#if hasVision(model)}
                <span class="cap-badge cap-vision" title="Vision">V</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <div class="pagination">
      <span class="pagination-info">
        {rangeStart}–{rangeEnd} of {filtered.length}
      </span>
      <div class="pagination-controls">
        <button
          type="button"
          class="page-btn"
          disabled={safeCurrentPage <= 1}
          onclick={() => { page = safeCurrentPage - 1; }}
        >
          Prev
        </button>
        <span class="page-indicator">{safeCurrentPage} / {totalPages}</span>
        <button
          type="button"
          class="page-btn"
          disabled={safeCurrentPage >= totalPages}
          onclick={() => { page = safeCurrentPage + 1; }}
        >
          Next
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 24px;
    box-sizing: border-box;
    min-height: 0;
  }

  .page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-shrink: 0;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .eyebrow {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
  }

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
  }

  .muted {
    margin: 0;
    color: var(--color-muted);
    font-size: 12px;
    font-family: "JetBrains Mono", monospace;
  }

  .search-input {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
    width: 260px;
    outline: none;
    transition: border-color 0.1s;
    flex-shrink: 0;
  }
  .search-input::placeholder {
    color: var(--color-dim);
  }
  .search-input:focus {
    border-color: var(--color-accent);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
  }

  .capability-filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filter-pill {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 10px;
    padding: 4px 9px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
    line-height: 1.4;
  }
  .filter-pill:hover {
    border-color: var(--color-border-bright);
    color: var(--color-text);
  }
  .filter-pill-active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #fff;
  }
  .filter-pill-active:hover {
    color: #fff;
    opacity: 0.9;
  }

  .provider-select {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    padding: 5px 8px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
    outline: none;
    cursor: pointer;
    flex-shrink: 0;
  }
  .provider-select:focus {
    border-color: var(--color-accent);
  }

  .table-wrapper {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    overflow: hidden;
  }

  .table-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .table-body {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
  }

  .table-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    min-height: 34px;
    border-top: 1px solid var(--color-border);
    transition: background 0.08s;
  }
  .table-row:first-child {
    border-top: none;
  }
  .table-row:hover {
    background: var(--color-hover);
  }

  .col-provider {
    width: 150px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
  }

  .provider-logo {
    flex-shrink: 0;
    border-radius: 2px;
  }

  .provider-name {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--color-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col-model {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .model-name {
    font-size: 12px;
    color: var(--color-text);
  }

  .col-family {
    width: 110px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .family-text {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  .col-context {
    width: 70px;
    flex-shrink: 0;
    text-align: right;
  }

  .context-text {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .col-cost {
    width: 150px;
    flex-shrink: 0;
    text-align: right;
  }

  .cost-text {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .col-caps {
    width: 110px;
    flex-shrink: 0;
    display: flex;
    gap: 3px;
    justify-content: flex-end;
  }

  .cap-badge {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 9px;
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    font-weight: 600;
  }

  .cap-reasoning {
    background: rgba(168, 130, 255, 0.15);
    color: #a882ff;
  }

  .cap-tool {
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .cap-struct {
    background: var(--color-success-dim);
    color: var(--color-success);
  }

  .cap-open {
    background: var(--color-warning-dim);
    color: var(--color-warning);
  }

  .cap-vision {
    background: var(--color-danger-dim);
    color: var(--color-danger);
  }

  .empty-state {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 12px;
    color: var(--color-dim);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
  }
  .empty-state p {
    margin: 0;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;
    flex-shrink: 0;
  }

  .pagination-info {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-btn {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
    transition: border-color 0.1s, color 0.1s;
  }
  .page-btn:hover:not(:disabled) {
    border-color: var(--color-border-bright);
    color: var(--color-text);
  }
  .page-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .page-indicator {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--color-dim);
    min-width: 50px;
    text-align: center;
  }

  @media (max-width: 900px) {
    .page {
      padding: 16px;
    }

    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .search-input {
      width: 100%;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .provider-select {
      width: 100%;
    }

    .col-family,
    .col-context {
      display: none;
    }

    .col-provider {
      width: 120px;
    }
  }
</style>
