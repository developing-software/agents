<script lang="ts">
  import type { AgentCompat, AgentWorkflow } from '@agents/core/agent';
  import Drawer from '$lib/ui/Drawer.svelte';
  import { dispatch as dispatchAgents, listFeaturedModels, listAgentConfigs } from '../api/dispatch.remote';
  import { updatePlan } from '$lib/features/agents/api/plans.remote';
  import BranchSelect from '$lib/features/git/components/BranchSelect.svelte';
  import TagList from '$lib/ui/tag/TagList.svelte';
  import MarkdownEditor from '$lib/ui/MarkdownEditor.svelte';
  import ModelSelector from './ModelSelector.svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { repoContext } from '$lib/features/git/context.svelte';

  export type OpenParams = {
    title?: string;
    prompt?: string;
    tags?: string[];
    multi?: boolean;
    branch?: string;
    planId?: string;
  };

  let {
    ondispatched,
  }: {
    ondispatched?: () => void;
  } = $props();

  const repo = repoContext.get();

  let isOpen = $state(false);
  let drawerTitle = $state('Dispatch');
  let tags = $state<string[]>([]);
  let multi = $state(true);
  let branch = $state<string | undefined>(undefined);
  let planId = $state<string | undefined>(undefined);

  let selectedModels = new SvelteSet<string>();
  let ref = $state('dev');
  let promptValue = $state('');
  let dispatching = $state(false);
  let dispatchError = $state<string | null>(null);
  let dispatchResults = $state<{ harness: string; status: string }[] | null>(null);

  export function open(params: OpenParams = {}) {
    drawerTitle = params.title ?? 'Dispatch';
    promptValue = params.prompt ?? '';
    tags = params.tags ?? [];
    multi = params.multi ?? true;
    branch = params.branch;
    planId = params.planId;
    dispatchResults = null;
    dispatchError = null;
    isOpen = true;
  }

  type AgentConfig = {
    id: AgentWorkflow.Agent;
    label: string;
    multiProvider: boolean;
    defaultModel: string;
  };
  type AgentData = {
    agents: AgentConfig[];
    featuredModels: Record<string, AgentCompat.AgentModelInfo[]>;
  };

  const agentDataPromise: Promise<AgentData> = listAgentConfigs({}).then(async (agents) => {
    const entries = await Promise.all(
      agents.map(async (a) => {
        const models = await listFeaturedModels({ agent: a.id });
        return [a.id, models] as const;
      }),
    );
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
      return { key, harness, model: rest.join(':') };
    })
  );

  async function handleDispatch() {
    if (selectedModels.size === 0 || !promptValue.trim()) return;
    dispatching = true;
    dispatchError = null;
    dispatchResults = null;
    try {
      const agentList = Array.from(selectedModels).map((key) => {
        const [harness, ...rest] = key.split(':');
        return { harness: harness as 'claude' | 'opencode' | 'codex', model: rest.join(':') };
      });

      const results = await dispatchAgents({
        organization: repo.organization,
        repoName: repo.repoName,
        prompt: promptValue,
        agents: agentList,
        ref: branch ?? ref,
        tags,
        branch,
      });

      if (planId) {
        await updatePlan({ id: planId, status: 'implementing' as any });
      }

      dispatchResults = results;
      ondispatched?.();
    } catch (err: unknown) {
      dispatchError = err instanceof Error ? err.message : 'Dispatch failed';
    } finally {
      dispatching = false;
    }
  }

  function close() {
    isOpen = false;
    dispatchResults = null;
    dispatchError = null;
    selectedModels.clear();
    agentDataPromise.then(({ agents }) => {
      if (agents.length > 0) selectedModels.add(`${agents[0].id}:${agents[0].defaultModel}`);
    });
    ref = 'dev';
  }
</script>

<Drawer bind:open={isOpen} title={drawerTitle} onclose={close} width="860px">
  <div class="drawer-content">
    {#if dispatchResults}
      <section class="section">
        <div class="section-label">Dispatched</div>
        <div class="results">
          {#each dispatchResults as result, i (i)}
            <div class="result-row">
              <span class="result-harness">{result.harness}</span>
              <span class="result-status success">{result.status}</span>
            </div>
          {/each}
        </div>
        {#if planId}
          <div class="plan-note">Plan status updated to <strong>implementing</strong>.</div>
        {/if}
        <button type="button" class="close-after-btn" onclick={close}>Close</button>
      </section>
    {:else}
      {#if tags.length > 0}
        <section class="section tags-row">
          <div class="section-label">Tags</div>
          <TagList {tags} limit={8} />
        </section>
      {/if}

      <div class="columns">
        <!-- Left: Prompt (main focus) -->
        <div class="col-prompt">
          <div class="section-label">Prompt</div>
          <div class="prompt-editor">
            <MarkdownEditor bind:value={promptValue} placeholder="Enter prompt..." minHeight="100%" />
          </div>
        </div>

        <!-- Right: Agents, Config, Dispatch -->
        <div class="col-config">
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
                      {multi}
                    />
                  </div>
                {/each}
              </div>
            {:catch}
              <div class="models-loading">Failed to load models</div>
            {/await}
          </section>

          {#if !branch}
            <section class="section">
              <div class="section-label">Configuration</div>
              <div class="config-grid">
                <label class="config-label" for="ref-input">Branch</label>
                <BranchSelect bind:value={ref} />
              </div>
            </section>
          {/if}

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

          <div class="drawer-footer">
            <button
              type="button"
              class="dispatch-btn"
              disabled={dispatching || selectedCount === 0 || !promptValue.trim()}
              onclick={handleDispatch}
            >
              {#if dispatching}
                Dispatching...
              {:else}
                Dispatch to {selectedCount} agent{selectedCount === 1 ? '' : 's'}
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Drawer>

<style>
  .drawer-content {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-height: 0;
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

  .tags-row {
    flex-shrink: 0;
  }

  .columns {
    display: flex;
    gap: 16px;
    flex: 1;
    min-height: 0;
  }

  .col-prompt {
    flex: 3;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .col-config {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    min-height: 0;
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

  /* ── Prompt ────────────────────────────────────────────────────────── */

  .prompt-editor {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .prompt-editor :global(.editor) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .prompt-editor :global(.editor-textarea),
  .prompt-editor :global(.preview) {
    flex: 1;
    min-height: 0;
    overflow: auto;
    font-size: 11px;
  }

  /* ── Preview list ──────────────────────────────────────────────────── */

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

  /* ── Error ─────────────────────────────────────────────────────────── */

  .error-msg {
    font-size: 11px;
    color: var(--color-danger);
    padding: 6px 10px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  }

  /* ── Footer ────────────────────────────────────────────────────────── */

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

  /* ── Results ───────────────────────────────────────────────────────── */

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
