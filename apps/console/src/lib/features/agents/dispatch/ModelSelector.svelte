<script lang="ts">
  import type { AgentCompat, AgentWorkflow } from '@agents/core/agent';
  import type { SvelteSet } from 'svelte/reactivity';
  import { Debounced, watch } from 'runed';
  import { searchAgentModels } from '../api/dispatch.remote';

  type AgentModelInfo = AgentCompat.AgentModelInfo;

  let {
    agent,
    agentLabel,
    featuredModels,
    selected,
    multi = true,
  }: {
    agent: AgentWorkflow.Agent;
    agentLabel: string;
    featuredModels: AgentModelInfo[];
    selected: SvelteSet<string>;
    multi?: boolean;
  } = $props();

  let activeTab = $state<'recommended' | 'all'>('recommended');
  let searchText = $state('');
  let searchPromise = $state<Promise<AgentModelInfo[]> | null>(null);
  let allTabLoaded = $state(false);

  let providerFilter = $state<string | null>(null);

  let providers = $derived.by(() => {
    const seen = new Map<string, { id: string; name: string; logo: string }>();
    for (const m of featuredModels) {
      if (!seen.has(m.providerId)) {
        seen.set(m.providerId, { id: m.providerId, name: m.providerName, logo: m.providerLogo });
      }
    }
    return [...seen.values()];
  });

  let isMultiProvider = $derived(providers.length > 1);

  function filterByProvider(models: AgentModelInfo[]): AgentModelInfo[] {
    if (!providerFilter) return models;
    return models.filter((m) => m.providerId === providerFilter);
  }

  let filteredFeatured = $derived(filterByProvider(featuredModels));

  let hasSelection = $derived(
    Array.from(selected).some((k) => k.startsWith(agent + ':'))
  );

  let selectedItems = $derived(
    Array.from(selected)
      .filter((k) => k.startsWith(agent + ':'))
      .map((k) => k.slice(agent.length + 1))
  );

  function formatCost(cost: AgentModelInfo['cost']): string | null {
    if (!cost) return null;
    const inp = cost.input != null ? `$${Math.round(cost.input)}` : null;
    const out = cost.output != null ? `$${Math.round(cost.output)}` : null;
    if (inp && out) return `${inp}/${out}`;
    if (inp) return inp;
    if (out) return out;
    return null;
  }

  function toggleModel(modelId: string) {
    const key = `${agent}:${modelId}`;
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      if (!multi) {
        for (const k of selected) selected.delete(k);
      }
      selected.add(key);
    }
  }

  function removeModel(modelId: string) {
    selected.delete(`${agent}:${modelId}`);
  }

  function handleLogoError(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    img.style.display = 'none';
  }

  function doSearch(query?: string) {
    searchPromise = searchAgentModels({ agent, search: query || undefined });
  }

  const debouncedSearch = new Debounced(() => searchText, 300);

  watch(() => debouncedSearch.current, () => {
    if (activeTab === 'all') doSearch(debouncedSearch.current);
  });

  function switchTab(tab: 'recommended' | 'all') {
    activeTab = tab;
    if (tab === 'all' && !allTabLoaded) {
      allTabLoaded = true;
      doSearch();
    }
  }

  function modelLabel(modelId: string): string {
    const featured = featuredModels.find((m) => m.id === modelId);
    if (featured) return featured.label;
    return modelId;
  }

</script>

<div class="model-selector">
  <!-- Selected chips strip -->
  {#if hasSelection}
    <div class="selected-chips">
      {#each selectedItems as modelId (modelId)}
        <span class="chip">
          <span class="chip-label">{modelLabel(modelId)}</span>
          <button
            type="button"
            class="chip-remove"
            onclick={() => removeModel(modelId)}
          >&times;</button>
        </span>
      {/each}
    </div>
  {/if}

  <!-- Provider filter (multi-provider agents only) -->
  {#if isMultiProvider}
    <div class="provider-filter">
      <button
        type="button"
        class="provider-pill"
        class:provider-pill-active={providerFilter === null}
        onclick={() => providerFilter = null}
      >All</button>
      {#each providers as provider (provider.id)}
        <button
          type="button"
          class="provider-pill"
          class:provider-pill-active={providerFilter === provider.id}
          onclick={() => providerFilter = providerFilter === provider.id ? null : provider.id}
        >
          <img
            class="provider-logo"
            src={provider.logo}
            alt=""
            onerror={handleLogoError}
          />
          <span>{provider.name}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Tab bar -->
  <div class="tab-bar">
    <button
      type="button"
      class="tab-btn"
      class:tab-btn-active={activeTab === 'recommended'}
      onclick={() => switchTab('recommended')}
    >Recommended</button>
    <button
      type="button"
      class="tab-btn"
      class:tab-btn-active={activeTab === 'all'}
      onclick={() => switchTab('all')}
    >All Models</button>
  </div>

  <!-- Tab content -->
  {#if activeTab === 'recommended'}
    <div class="tab-content">
      {#each filteredFeatured as model (model.id)}
        <button
          type="button"
          class="result-row"
          class:result-row-active={selected.has(`${agent}:${model.id}`)}
          onclick={() => toggleModel(model.id)}
        >
          <img
            class="provider-logo"
            src={model.providerLogo}
            alt=""
            onerror={handleLogoError}
          />
          <span class="result-name">{model.label}</span>
          {#if model.family}
            <span class="result-family">{model.family}</span>
          {/if}
          {#if formatCost(model.cost)}
            <span class="model-cost">{formatCost(model.cost)}</span>
          {/if}
        </button>
      {/each}
    </div>
  {:else}
    <div class="all-models-section">
      <input
        type="text"
        class="search-input"
        placeholder="Search {agentLabel} models..."
        bind:value={searchText}
      />
      <div class="tab-content">
        {#if searchPromise}
          {#await searchPromise}
            <div class="results-status">Loading...</div>
          {:then results}
            {@const filtered = filterByProvider(results)}
            {#if filtered.length === 0}
              <div class="results-status">No models found</div>
            {:else}
              {#each filtered as model (model.id)}
                <button
                  type="button"
                  class="result-row"
                  class:result-row-active={selected.has(`${agent}:${model.id}`)}
                  onclick={() => toggleModel(model.id)}
                >
                  <img
                    class="provider-logo"
                    src={model.providerLogo}
                    alt=""
                    onerror={handleLogoError}
                  />
                  <span class="result-name">{model.label}</span>
                  {#if model.family}
                    <span class="result-family">{model.family}</span>
                  {/if}
                  {#if formatCost(model.cost)}
                    <span class="model-cost">{formatCost(model.cost)}</span>
                  {/if}
                </button>
              {/each}
            {/if}
          {:catch}
            <div class="results-status">Failed to load</div>
          {/await}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .model-selector {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* Selected chips strip */
  .selected-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .chip {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--color-text);
  }

  .chip-label {
    white-space: nowrap;
  }

  .chip-remove {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-dim);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
  }
  .chip-remove:hover {
    color: var(--color-danger);
  }

  /* Provider filter */
  .provider-filter {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .provider-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 3px;
    transition: all 0.1s;
  }
  .provider-pill:hover {
    border-color: var(--color-border-bright);
    color: var(--color-text);
  }
  .provider-pill-active {
    background: var(--color-elevated);
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  /* Tab bar */
  .tab-bar {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .tab-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 10px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-dim);
    cursor: pointer;
  }
  .tab-btn:hover {
    color: var(--color-text);
  }
  .tab-btn-active {
    border-bottom-color: var(--color-accent);
    color: var(--color-text);
  }

  /* Tab content area */
  .tab-content {
    max-height: 160px;
    overflow-y: auto;
  }

  .model-cost {
    font-size: 9px;
    color: var(--color-dim);
    margin-left: 4px;
  }

  .provider-logo {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  /* All Models tab */
  .all-models-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .search-input {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-text);
  }
  .search-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }
  .search-input::placeholder {
    color: var(--color-dim);
  }

  /* Result rows (both tabs) */
  .results-status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    padding: 8px;
    text-align: center;
  }

  .result-row {
    width: 100%;
    padding: 4px 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    color: var(--color-muted);
    text-align: left;
  }
  .result-row:hover {
    background: var(--color-hover);
  }
  .result-row-active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-text);
  }
  .result-row-active:hover {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  }

  .result-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-family {
    font-size: 9px;
    color: var(--color-dim);
    background: var(--color-surface);
    padding: 0 4px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }
</style>
