<script lang="ts">
  import Drawer from '$lib/ui/Drawer.svelte';
  import { previewPrompt, dispatchPlan } from './dispatch.remote';
  import { statusDotColor, statusBadgeStyle } from '$lib/plans/plan-helpers';
  import TagList from '$lib/tag/TagList.svelte';

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

  const AGENTS = [
    { harness: 'claude' as const, label: 'Claude', description: 'Anthropic Claude agent' },
    { harness: 'opencode' as const, label: 'OpenCode', description: 'OpenCode agent' },
    { harness: 'codex' as const, label: 'Codex', description: 'OpenAI Codex agent' },
  ];

  let selectedAgents = $state<Set<string>>(new Set(['claude']));
  let modelOverrides = $state<Record<string, string>>({});
  let ref = $state('dev');
  let extraTagsInput = $state('');
  let promptPreview = $state<string | null>(null);
  let promptExpanded = $state(false);
  let loadingPreview = $state(false);
  let dispatching = $state(false);
  let dispatchError = $state<string | null>(null);
  let dispatchResults = $state<{ harness: string; status: string }[] | null>(null);

  function toggleAgent(harness: string) {
    const next = new Set(selectedAgents);
    if (next.has(harness)) {
      next.delete(harness);
    } else {
      next.add(harness);
    }
    selectedAgents = next;
  }

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
    if (selectedAgents.size === 0) return;
    dispatching = true;
    dispatchError = null;
    dispatchResults = null;
    try {
      const extraTags = extraTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const agentList = Array.from(selectedAgents).map((harness) => ({
        harness: harness as 'claude' | 'opencode' | 'codex',
        model: modelOverrides[harness] || undefined,
      }));

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
    // Reset state for next open
    dispatchResults = null;
    dispatchError = null;
    promptPreview = null;
    promptExpanded = false;
    selectedAgents = new Set(['claude']);
    modelOverrides = {};
    ref = 'dev';
    extraTagsInput = '';
  }

  let selectedCount = $derived(selectedAgents.size);
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
        <div class="agent-list">
          {#each AGENTS as agent (agent.harness)}
            <label class="agent-row" class:agent-selected={selectedAgents.has(agent.harness)}>
              <input
                type="checkbox"
                class="agent-checkbox"
                checked={selectedAgents.has(agent.harness)}
                onchange={() => toggleAgent(agent.harness)}
              />
              <span class="agent-name">{agent.label}</span>
              <span class="agent-desc">{agent.description}</span>
              {#if selectedAgents.has(agent.harness)}
                <input
                  type="text"
                  class="model-input"
                  placeholder="model override (optional)"
                  bind:value={modelOverrides[agent.harness]}
                  onclick={(e) => e.stopPropagation()}
                />
              {/if}
            </label>
          {/each}
        </div>
      </section>

      <!-- Configuration -->
      <section class="section">
        <div class="section-label">Configuration</div>
        <div class="config-grid">
          <label class="config-label" for="ref-input">Git ref</label>
          <input id="ref-input" type="text" class="config-input" bind:value={ref} placeholder="dev" />

          <label class="config-label" for="extra-tags-input">Extra tags</label>
          <input id="extra-tags-input" type="text" class="config-input" bind:value={extraTagsInput} placeholder="tag1, tag2" />
        </div>
      </section>

      <!-- Prompt Preview -->
      <section class="section">
        <button type="button" class="preview-toggle" onclick={loadPromptPreview}>
          {#if loadingPreview}
            Loading prompt…
          {:else if promptExpanded}
            ▾ Prompt Preview
          {:else}
            ▸ Prompt Preview
          {/if}
        </button>
        {#if promptExpanded && promptPreview !== null}
          <pre class="prompt-preview">{promptPreview}</pre>
        {/if}
      </section>

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
            Dispatching…
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

  .agent-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s;
    flex-wrap: wrap;
  }
  .agent-row:hover {
    background: var(--color-elevated);
  }
  .agent-selected {
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }

  .agent-checkbox {
    flex-shrink: 0;
    accent-color: var(--color-accent);
  }

  .agent-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 500;
    flex-shrink: 0;
  }

  .agent-desc {
    font-size: 11px;
    color: var(--color-dim);
    flex: 1;
  }

  .model-input {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 6px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-text);
    width: 100%;
    margin-top: 4px;
  }
  .model-input:focus {
    outline: none;
    border-color: var(--color-accent);
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
