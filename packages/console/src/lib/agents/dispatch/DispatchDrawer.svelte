<script lang="ts">
  import Drawer from '$lib/ui/Drawer.svelte';
  import { previewPrompt, dispatchPlan, listBranches, listFeaturedModels, listAgentConfigs } from './dispatch.remote';
  import { statusDotColor, statusBadgeStyle } from '$lib/agents/plans/plan-helpers';
  import TagList from '$lib/ui/tag/TagList.svelte';
  import ModelSelector from './ModelSelector.svelte';
  import { SvelteSet } from 'svelte/reactivity';

  type PlanItem = {
    id: string;
    title: string;
    body: string;
    status: string;
    authorType: string;
    tags: string[];
    data: Record<string, unknown>;
    source: string | null;
    sourceId: string | null;
    createdBy: string | null;
    timeCreated: string;
    timeUpdated: string;
  };

  let {
    plan,
    organization,
    repoName,
    open = $bindable(false),
    ondispatched,
  }: {
    plan: PlanItem;
    organization: string;
    repoName: string;
    open?: boolean;
    ondispatched?: (planId: string) => void;
  } = $props();

  const SCOPE_OPTIONS = ['small', 'medium', 'large'] as const;
  const TYPE_OPTIONS = ['bug', 'feature', 'task'] as const;

  let selectedModels = new SvelteSet<string>();
  let selectedScope = $state<string | null>(null);
  let selectedType = $state<string | null>(null);
  let ref = $state('dev');
  const branchesPromise = listBranches({ organization, repoName });
  let promptPreview = $state<string | null>(null);
  let promptExpanded = $state(false);
  let loadingPreview = $state(false);
  let dispatching = $state(false);
  let dispatchError = $state<string | null>(null);
  let dispatchResults = $state<{ harness: string; status: string }[] | null>(null);

  type AgentConfig = { id: string; label: string; multiProvider: boolean; defaultModel: string };
  type AgentData = { agents: AgentConfig[]; featuredModels: Record<string, unknown[]> };

  const agentDataPromise: Promise<AgentData> = listAgentConfigs({}).then(async (agents) => {
    const entries = await Promise.all(
      agents.map(async (a) => {
        const models = await listFeaturedModels({ agent: a.id as 'claude' | 'opencode' | 'codex' });
        return [a.id, models] as const;
      }),
    );
    // Set default selection from the first agent's default model
    if (selectedModels.size === 0 && agents.length > 0) {
      selectedModels.add(`${agents[0].id}:${agents[0].defaultModel}`);
    }
    return { agents, featuredModels: Object.fromEntries(entries) };
  });

  function hasAgent(harness: string): boolean {
    return Array.from(selectedModels).some((k) => k.startsWith(harness + ':'));
  }

  let selectedCount = $derived(selectedModels.size);

  const dispatchPreview = $derived(
    Array.from(selectedModels).map((key) => {
      const [harness, ...rest] = key.split(':');
      const modelId = rest.join(':');
      return { key, harness, model: modelId };
    })
  );

  async function loadPromptPreview() {
    if (promptPreview !== null) {
      promptExpanded = !promptExpanded;
      return;
    }
    loadingPreview = true;
    try {
      promptPreview = await previewPrompt({ planId: plan.id });
      promptExpanded = true;
    } finally {
      loadingPreview = false;
    }
  }

  async function handleDispatch() {
    if (selectedModels.size === 0) return;
    dispatching = true;
    dispatchError = null;
    dispatchResults = null;
    try {
      const extraTags: string[] = [];
      if (selectedScope) extraTags.push(`scope:${selectedScope}`);
      if (selectedType) extraTags.push(`type:${selectedType}`);

      const agentList = Array.from(selectedModels).map((key) => {
        const [harness, ...rest] = key.split(':');
        return { harness: harness as 'claude' | 'opencode' | 'codex', model: rest.join(':') };
      });

      const results = await dispatchPlan({
        planId: plan.id,
        organization,
        repoName,
        agents: agentList,
        ref,
        extraTags: extraTags.length > 0 ? extraTags : undefined,
      });

      dispatchResults = results;
      ondispatched?.(plan.id);
    } catch (err: unknown) {
      dispatchError = err instanceof Error ? err.message : 'Dispatch failed';
    } finally {
      dispatching = false;
    }
  }

  function close() {
    open = false;
    dispatchResults = null;
    dispatchError = null;
    promptPreview = null;
    promptExpanded = false;
    // Re-initialize default selection from loaded config
    selectedModels.clear();
    agentDataPromise.then(({ agents }) => {
      if (agents.length > 0) selectedModels.add(`${agents[0].id}:${agents[0].defaultModel}`);
    });
    selectedScope = null;
    selectedType = null;
    ref = 'dev';
  }
</script>

<Drawer bind:open title="Dispatch Plan" onclose={close}>
  <div class="drawer-content">
    <!-- Plan Summary -->
    <section class="section">
      <div class="plan-summary">
        <span class="dot" style="background: {statusDotColor(plan.status)}"></span>
        <span class="plan-title">{plan.title}</span>
        <span class="status-badge" style={statusBadgeStyle(plan.status)}>{plan.status}</span>
      </div>
      {#if plan.tags.length > 0}
        <div class="plan-tags">
          <TagList tags={plan.tags} limit={8} />
        </div>
      {/if}
    </section>

    {#if dispatchResults}
      <!-- Results -->
      <section class="section">
        <div class="section-label">Dispatched</div>
        <div class="results">
          {#each dispatchResults as result (result.harness)}
            <div class="result-row">
              <span class="result-harness">{result.harness}</span>
              <span class="result-status success">{result.status}</span>
            </div>
          {/each}
        </div>
        <div class="plan-note">Plan status updated to <strong>implementing</strong>.</div>
        <button type="button" class="close-after-btn" onclick={close}>Close</button>
      </section>
    {:else}
      <!-- Agent Selection -->
      <section class="section">
        <div class="section-label">Agents</div>
        {#await agentDataPromise}
          <div class="models-loading">Loading models...</div>
        {:then data}
          <div class="agent-list">
            {#each data.agents as agent (agent.id)}
              <div class="agent-group" class:agent-active={hasAgent(agent.id)}>
                <div class="agent-header">
                  <span class="agent-name">{agent.label}</span>
                </div>
                <ModelSelector
                  agent={agent.id}
                  agentLabel={agent.label}
                  featuredModels={data.featuredModels[agent.id] ?? []}
                  selected={selectedModels}
                  multiProvider={agent.multiProvider}
                />
              </div>
            {/each}
          </div>
        {:catch}
          <div class="models-loading">Failed to load models</div>
        {/await}
      </section>

      <!-- Configuration -->
      <section class="section">
        <div class="section-label">Configuration</div>
        <div class="config-grid">
          <label class="config-label" for="ref-input">Branch</label>
          {#await branchesPromise}
            <span class="config-loading">Loading...</span>
          {:then branches}
            {#if branches.length > 0}
              <select id="ref-input" class="config-select" bind:value={ref}>
                {#each branches as branch (branch.name)}
                  <option value={branch.name}>{branch.name}</option>
                {/each}
              </select>
            {:else}
              <input id="ref-input" type="text" class="config-input" bind:value={ref} placeholder="dev" />
            {/if}
          {:catch}
            <input id="ref-input" type="text" class="config-input" bind:value={ref} placeholder="dev" />
          {/await}
        </div>

        <div class="tag-selector">
          <span class="tag-selector-label">Scope</span>
          <div class="tag-pills">
            {#each SCOPE_OPTIONS as opt (opt)}
              <button
                type="button"
                class="tag-pill"
                class:tag-pill-active={selectedScope === opt}
                onclick={() => { selectedScope = selectedScope === opt ? null : opt; }}
              >
                {opt}
              </button>
            {/each}
          </div>
        </div>

        <div class="tag-selector">
          <span class="tag-selector-label">Type</span>
          <div class="tag-pills">
            {#each TYPE_OPTIONS as opt (opt)}
              <button
                type="button"
                class="tag-pill"
                class:tag-pill-active={selectedType === opt}
                onclick={() => { selectedType = selectedType === opt ? null : opt; }}
              >
                {opt}
              </button>
            {/each}
          </div>
        </div>
      </section>

      <!-- Prompt Preview -->
      <section class="section">
        <button type="button" class="preview-toggle" onclick={loadPromptPreview}>
          {#if loadingPreview}
            Loading prompt...
          {:else if promptExpanded}
            &#9662; Prompt Preview
          {:else}
            &#9656; Prompt Preview
          {/if}
        </button>
        {#if promptExpanded && promptPreview !== null}
          <pre class="prompt-preview">{promptPreview}</pre>
        {/if}
      </section>

      <!-- Dispatch Preview -->
      {#if dispatchPreview.length > 0}
        <section class="section">
          <div class="section-label">Will dispatch</div>
          <div class="preview-list">
            {#each dispatchPreview as item (item.key)}
              <div class="preview-row">
                <span class="preview-harness">{item.harness}</span>
                <span class="preview-sep">/</span>
                <span class="preview-model">{item.model}</span>
                <button
                  type="button"
                  class="preview-remove"
                  onclick={() => { selectedModels.delete(item.key); }}
                >x</button>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      {#if dispatchError}
        <div class="error-msg">{dispatchError}</div>
      {/if}

      <!-- Dispatch Button -->
      <div class="drawer-footer">
        <button
          type="button"
          class="dispatch-btn"
          disabled={dispatching || selectedCount === 0}
          onclick={handleDispatch}
        >
          {#if dispatching}
            Dispatching...
          {:else}
            Dispatch to {selectedCount} agent{selectedCount === 1 ? '' : 's'}
          {/if}
        </button>
      </div>
    {/if}
  </div>
</Drawer>

<style>
  .drawer-content {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .plan-summary {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .plan-title {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 500;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .plan-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .agent-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .agent-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    transition: border-color 0.1s;
  }
  .agent-active {
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
    background: color-mix(in srgb, var(--color-accent) 4%, transparent);
  }

  .agent-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .agent-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 500;
    flex-shrink: 0;
  }

  .models-loading {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    padding: 8px 0;
  }

  .config-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 10px;
    align-items: center;
  }

  .config-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    white-space: nowrap;
  }

  .config-select {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-text);
    cursor: pointer;
    outline: none;
  }
  .config-select:focus {
    border-color: var(--color-accent);
  }

  .config-loading {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .config-input {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-text);
  }
  .config-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .tag-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  .tag-selector-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    min-width: 50px;
  }

  .tag-pills {
    display: flex;
    gap: 4px;
  }

  .tag-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.1s;
  }
  .tag-pill:hover {
    border-color: var(--color-border-bright);
    color: var(--color-text);
  }
  .tag-pill-active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #fff;
  }
  .tag-pill-active:hover {
    opacity: 0.9;
    color: #fff;
  }

  .preview-toggle {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    text-align: left;
    padding: 0;
  }
  .preview-toggle:hover { color: var(--color-text); }

  .prompt-preview {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 10px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
    margin: 0;
  }

  .preview-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .preview-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
  }

  .preview-harness {
    color: var(--color-text);
    font-weight: 500;
  }

  .preview-sep {
    color: var(--color-dim);
  }

  .preview-model {
    color: var(--color-muted);
    flex: 1;
  }

  .preview-remove {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    background: none;
    border: none;
    color: var(--color-dim);
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }
  .preview-remove:hover {
    color: var(--color-danger);
  }

  .error-msg {
    font-size: 11px;
    color: var(--color-danger);
    padding: 6px 10px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  }

  .drawer-footer {
    padding-top: 4px;
  }

  .dispatch-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    padding: 7px 16px;
    border-radius: 4px;
    border: none;
    background: var(--color-accent);
    color: #fff;
    cursor: pointer;
    width: 100%;
    transition: opacity 0.1s;
  }
  .dispatch-btn:hover:not(:disabled) { opacity: 0.9; }
  .dispatch-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
  }

  .result-harness {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    flex: 1;
  }

  .result-status.success {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-success);
    padding: 1px 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
  }

  .plan-note {
    font-size: 11px;
    color: var(--color-muted);
  }

  .close-after-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 5px 14px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
    transition: background 0.1s;
  }
  .close-after-btn:hover { background: var(--color-hover); }
</style>
