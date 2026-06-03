<script lang="ts">
  import type { AgentCompat, AgentWorkflow } from "@agents/core/agent";
  import type { Plan } from "@agents/core/events/plan";
  import Drawer from "$lib/ui/Drawer.svelte";
  import DispatchOptions from "./DispatchOptions.svelte";
  import {
    dispatch as dispatchAgents,
    listFeaturedModels,
    listAgentConfigs,
  } from "../api/dispatch.remote";
  import { updatePlan } from "$lib/features/agents/api/plans.remote";
  import BranchSelect from "$lib/features/git/components/BranchSelect.svelte";
  import TagList from "$lib/ui/tag/TagList.svelte";
  import MarkdownEditor from "$lib/ui/MarkdownEditor.svelte";
  import ModelSelector from "./ModelSelector.svelte";
  import { SvelteSet, SvelteMap } from "svelte/reactivity";
  import { repoContext } from "$lib/features/git/context.svelte";

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
    ongenerate,
  }: {
    ondispatched?: () => void;
    ongenerate?: (
      opts: Plan.ToPromptOptions,
    ) => Promise<{ prompt: string; tags: string[] }>;
  } = $props();

  const repo = repoContext.get();

  let isOpen = $state(false);
  let drawerTitle = $state("Dispatch");
  let tags = $state<string[]>([]);
  let multi = $state(true);
  let branch = $state<string | undefined>(undefined);
  let planId = $state<string | undefined>(undefined);

  let selectedModels = new SvelteSet<string>();
  let activeAgent = $state<AgentWorkflow.Agent | undefined>(undefined);
  let ref = $state("dev");
  let promptValue = $state("");
  let promptMode = $state<"shared" | "per-model">("shared");
  let perModelPrompts = new SvelteMap<string, string>();
  let dispatching = $state(false);
  let dispatchError = $state<string | null>(null);
  let dispatchResults = $state<{ harness: string; status: string }[] | null>(
    null,
  );

  type Step = { id: string; label: string };

  const steps: Step[] = [
    { id: "options", label: "Options" },
    { id: "models", label: "Models" },
    { id: "dispatch", label: "Dispatch" },
  ];

  let currentStep = $state(0);
  const currentStepId = $derived(steps[currentStep]?.id);
  const isFirstStep = $derived(currentStep === 0);
  const isLastStep = $derived(currentStep === steps.length - 1);

  let optionsForm = $state<DispatchOptions>();
  let generating = $state(false);
  let generateError = $state<string | null>(null);

  function prevStep() {
    if (currentStep > 0) currentStep--;
  }

  function goToStep(index: number) {
    if (index > currentStep && currentStepId === "options") return;
    if (index >= 0 && index < steps.length) currentStep = index;
  }

  async function handleNext() {
    generateError = null;
    if (currentStepId === "options") {
      if (!ongenerate || !optionsForm) return;
      generating = true;
      try {
        const result = await ongenerate(optionsForm.getOptions());
        promptValue = result.prompt;
        tags = result.tags;
      } catch (err: unknown) {
        generateError =
          err instanceof Error ? err.message : "Failed to generate prompt";
        return;
      } finally {
        generating = false;
      }
    } else if (currentStepId === "models") {
      if (selectedModels.size === 0) {
        generateError = "Please select at least one model";
        return;
      }
    }
    if (currentStep < steps.length - 1) currentStep++;
  }

  export function open(params: OpenParams = {}) {
    drawerTitle = params.title ?? "Dispatch";
    promptValue = params.prompt ?? "";
    promptMode = "shared";
    perModelPrompts.clear();
    tags = params.tags ?? [];
    multi = params.multi ?? true;
    branch = params.branch;
    planId = params.planId;
    dispatchResults = null;
    dispatchError = null;
    generateError = null;
    currentStep = 0;
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

  const agentDataPromise: Promise<AgentData> = listAgentConfigs({}).then(
    async (agents) => {
      const entries = await Promise.all(
        agents.map(async (a) => {
          const models = await listFeaturedModels({ agent: a.id });
          return [a.id, models] as const;
        }),
      );
      if (selectedModels.size === 0 && agents.length > 0) {
        selectedModels.add(`${agents[0].id}:${agents[0].defaultModel}`);
      }
      if (!activeAgent && agents.length > 0) activeAgent = agents[0].id;
      return { agents, featuredModels: Object.fromEntries(entries) };
    },
  );

  function hasAgent(harness: string): boolean {
    return Array.from(selectedModels).some((k) => k.startsWith(harness + ":"));
  }

  function agentCount(harness: string): number {
    return Array.from(selectedModels).filter((k) => k.startsWith(harness + ":"))
      .length;
  }

  let selectedCount = $derived(selectedModels.size);

  const dispatchPreview = $derived(
    Array.from(selectedModels).map((key) => {
      const [harness, ...rest] = key.split(":");
      return { key, harness, model: rest.join(":") };
    }),
  );

  function setPromptMode(mode: "shared" | "per-model") {
    if (mode === "per-model") {
      for (const key of selectedModels) {
        if (!perModelPrompts.has(key)) perModelPrompts.set(key, promptValue);
      }
    }
    promptMode = mode;
  }
  const promptsReady = $derived(
    promptMode === "shared"
      ? promptValue.trim().length > 0
      : selectedCount > 0 &&
          Array.from(selectedModels).every(
            (key) => (perModelPrompts.get(key) ?? "").trim().length > 0,
          ),
  );

  async function handleDispatch() {
    if (selectedModels.size === 0 || !promptsReady) return;
    dispatching = true;
    dispatchError = null;
    dispatchResults = null;
    try {
      const agentList = Array.from(selectedModels).map((key) => {
        const [harness, ...rest] = key.split(":");
        return {
          harness: harness as "claude" | "opencode" | "codex",
          model: rest.join(":"),
          prompt:
            promptMode === "per-model"
              ? (perModelPrompts.get(key) ?? "")
              : undefined,
        };
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
        await updatePlan({ id: planId, status: "implementing" as any });
      }

      dispatchResults = results;
      ondispatched?.();
    } catch (err: unknown) {
      dispatchError = err instanceof Error ? err.message : "Dispatch failed";
    } finally {
      dispatching = false;
    }
  }

  function close() {
    isOpen = false;
    dispatchResults = null;
    dispatchError = null;
    promptMode = "shared";
    perModelPrompts.clear();
    selectedModels.clear();
    agentDataPromise.then(({ agents }) => {
      if (agents.length > 0) {
        selectedModels.add(`${agents[0].id}:${agents[0].defaultModel}`);
        activeAgent = agents[0].id;
      }
    });
    ref = "dev";
    currentStep = 0;
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
          <div class="plan-note">
            Plan status updated to <strong>implementing</strong>.
          </div>
        {/if}
        <button type="button" class="close-after-btn" onclick={close}
          >Close</button
        >
      </section>
    {:else}
      {#if steps.length > 1}
        <nav class="stepper">
          {#each steps as step, i (step.id)}
            <button
              type="button"
              class="step-pill"
              class:step-active={i === currentStep}
              class:step-done={i < currentStep}
              onclick={() => goToStep(i)}
            >
              <span class="step-index">
                {#if i < currentStep}
                  {@render check()}
                {:else}
                  {i + 1}
                {/if}
              </span>
              <span class="step-label">{step.label}</span>
            </button>
            {#if i < steps.length - 1}
              <span class="step-divider"></span>
            {/if}
          {/each}
        </nav>
      {/if}

      <div class="step-body">
        {#if currentStepId === "options"}
          <DispatchOptions bind:this={optionsForm} disabled={generating} />
        {:else if currentStepId === "models"}
          {@render step2()}
        {:else if currentStepId === "dispatch"}
          {@render step3()}
        {/if}
      </div>

      {#if generateError}
        <div class="error-msg">{generateError}</div>
      {/if}
      {#if dispatchError}
        <div class="error-msg">{dispatchError}</div>
      {/if}

      <div class="step-footer">
        {#if isFirstStep}
          Step {currentStep + 1} of {steps.length}
        {:else}
          <button
            type="button"
            class="nav-btn"
            disabled={isFirstStep || generating}
            onclick={prevStep}>Back</button
          >
        {/if}
        {#if isLastStep}
          <button
            type="button"
            class="dispatch-btn"
            disabled={dispatching || selectedCount === 0 || !promptsReady}
            onclick={handleDispatch}
          >
            {#if dispatching}
              Dispatching...
            {:else}
              Dispatch to {selectedCount} agent{selectedCount === 1 ? "" : "s"}
            {/if}
          </button>
        {:else}
          <button
            type="button"
            class="next-btn"
            disabled={generating}
            onclick={handleNext}
          >
            {#if generating}
              Generating…
            {:else if currentStepId === "options"}
              Generate & Continue
            {:else}
              Next
            {/if}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</Drawer>

{#snippet step2()}
  <div class="col-config">
    <section class="section">
      <div class="section-label">Agents</div>
      {#await agentDataPromise}
        <div class="models-loading">Loading models...</div>
      {:then data}
        <div class="agent-panel">
          <div class="agent-rail">
            {#each data.agents as agent (agent.id)}
              <button
                type="button"
                class="agent-tab"
                class:agent-tab-active={activeAgent === agent.id}
                class:agent-tab-selected={hasAgent(agent.id)}
                onclick={() => (activeAgent = agent.id)}
              >
                <span class="agent-name">{agent.label}</span>
                {#if agentCount(agent.id) > 0}
                  <span class="agent-count">{agentCount(agent.id)}</span>
                {/if}
              </button>
            {/each}
          </div>
          <div class="agent-detail">
            {#each data.agents as agent (agent.id)}
              <div
                class="agent-pane"
                class:agent-pane-hidden={activeAgent !== agent.id}
              >
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

    <section class="section">
      <div class="section-label">
        Will dispatch
        {#if dispatchPreview.length > 0}
          <span class="label-count">{dispatchPreview.length}</span>
        {/if}
      </div>
      {#if dispatchPreview.length > 0}
        <div class="preview-list">
          {#each dispatchPreview as item (item.key)}
            <div class="preview-row">
              <span class="preview-harness">{item.harness}</span>
              <span class="preview-model">{item.model}</span>
              <button
                type="button"
                class="preview-remove"
                aria-label="Remove {item.harness} / {item.model}"
                onclick={() => {
                  selectedModels.delete(item.key);
                }}>&times;</button
              >
            </div>
          {/each}
        </div>
      {:else}
        <div class="preview-empty">Select at least one model above.</div>
      {/if}
    </section>
  </div>
{/snippet}

{#snippet step3()}
  {#if tags.length > 0}
    <section class="section tags-row">
      <div class="section-label">Tags</div>
      <TagList {tags} limit={8} />
    </section>
  {/if}

  <section class="section prompt-mode">
    <div class="section-label">Prompt</div>
    <div class="mode-cards">
      <label class="mode-card" class:mode-card-active={promptMode === "shared"}>
        <input
          type="radio"
          name="prompt-mode"
          value="shared"
          checked={promptMode === "shared"}
          onchange={() => setPromptMode("shared")}
        />
        <span class="mode-text">
          <span class="mode-title">One prompt for all</span>
          <span class="mode-desc">
            Send the same instructions to all {selectedCount} model{selectedCount ===
            1
              ? ""
              : "s"}.
          </span>
        </span>
      </label>
      <label
        class="mode-card"
        class:mode-card-active={promptMode === "per-model"}
      >
        <input
          type="radio"
          name="prompt-mode"
          value="per-model"
          checked={promptMode === "per-model"}
          onchange={() => setPromptMode("per-model")}
        />
        <span class="mode-text">
          <span class="mode-title">Per-model prompts</span>
          <span class="mode-desc">
            Tailor a distinct prompt for each selected model.
          </span>
        </span>
      </label>
    </div>
  </section>

  {#if promptMode === "shared"}
    <div class="prompt-editor">
      <MarkdownEditor
        bind:value={promptValue}
        placeholder="Enter prompt..."
        minHeight="50%"
      />
    </div>
  {:else}
    <div class="per-model-list">
      {#each dispatchPreview as item (item.key)}
        <div class="per-model-item">
          <div class="per-model-head">
            <span class="preview-harness">{item.harness}</span>
            <span class="preview-model">{item.model}</span>
          </div>
          <MarkdownEditor
            bind:value={
              () => perModelPrompts.get(item.key) ?? "",
              (v) => perModelPrompts.set(item.key, v)
            }
            placeholder="Prompt for {item.harness} / {item.model}..."
            minHeight="140px"
          />
        </div>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet check()}
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
    <path
      d="M3.5 8.5l3 3 6-7"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/snippet}

<style>
  .drawer-content {
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

  .col-config {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    min-height: 0;
  }

  .agent-panel {
    display: flex;
    gap: 10px;
    align-items: stretch;
  }

  .agent-rail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 150px;
    flex-shrink: 0;
  }

  .agent-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-elevated);
    cursor: pointer;
    text-align: left;
    transition:
      border-color 0.12s ease,
      background-color 0.12s ease;
  }
  .agent-tab:hover {
    border-color: color-mix(
      in srgb,
      var(--color-accent) 35%,
      var(--color-border)
    );
  }
  .agent-tab-selected {
    border-color: color-mix(
      in srgb,
      var(--color-accent) 45%,
      var(--color-border)
    );
  }
  .agent-tab-active {
    border-color: var(--color-accent);
    background: color-mix(
      in srgb,
      var(--color-accent) 10%,
      var(--color-elevated)
    );
  }

  .agent-detail {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-elevated);
    padding: 10px 12px;
  }

  .agent-pane-hidden {
    display: none;
  }

  .agent-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 500;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agent-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--color-accent);
    color: #fff;
    flex-shrink: 0;
  }

  .label-count {
    font-weight: 600;
    color: var(--color-accent);
    margin-left: 2px;
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

  /* ── Prompt mode ───────────────────────────────────────────────────── */

  .prompt-mode {
    flex-shrink: 0;
  }

  .mode-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .mode-card {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-elevated);
    cursor: pointer;
    transition:
      border-color 0.1s,
      background 0.1s;
  }
  .mode-card:hover {
    border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
  }
  .mode-card-active {
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }

  .mode-card input {
    margin: 1px 0 0;
    accent-color: var(--color-accent);
    cursor: pointer;
    flex-shrink: 0;
  }

  .mode-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .mode-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text);
  }

  .mode-desc {
    font-size: 11px;
    color: var(--color-dim);
    line-height: 1.4;
  }

  /* ── Per-model prompts ─────────────────────────────────────────────── */

  .per-model-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .per-model-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .per-model-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
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
    flex-wrap: wrap;
    gap: 6px;
  }

  .preview-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 6px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    max-width: 100%;
  }

  .preview-harness {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    flex-shrink: 0;
  }

  .preview-model {
    color: var(--color-text);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-remove {
    font-family: "JetBrains Mono", monospace;
    font-size: 14px;
    background: none;
    border: none;
    color: var(--color-dim);
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    border-radius: 3px;
    flex-shrink: 0;
    transition:
      color 0.1s,
      background-color 0.1s;
  }
  .preview-remove:hover {
    color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
  }

  .preview-empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    padding: 8px 10px;
    border: 1px dashed var(--color-border);
    border-radius: 4px;
    text-align: center;
  }

  /* ── Error ─────────────────────────────────────────────────────────── */

  .error-msg {
    font-size: 14px;
    margin: 0 16px;
    color: var(--color-danger);
    padding: 12px 10px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
  }

  .step-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0px;
    /* border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated); */
    color: var(--color-dim);
    cursor: pointer;
    font-family: "JetBrains Mono", monospace;
    font-size: 14px;
    font-weight: 600;
    transition:
      border-color 0.1s,
      color 0.1s;
  }
  .step-pill:hover {
    color: var(--color-text);
  }

  .step-active {
    border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
    color: var(--color-text);
  }
  .step-done {
    color: var(--color-accent);
  }

  .step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-hover);
    font-size: 10px;
    flex-shrink: 0;
  }
  .step-active .step-index {
    background: var(--color-accent);
    color: #fff;
  }
  .step-done .step-index {
    background: var(--color-accent);
    color: #fff;
  }

  .step-divider {
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  .step-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-height: 0;
    padding: 12px 16px;
  }

  .step-footer {
    border-top: 1px solid var(--color-border);
    background-color: var(--color-elevated);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    flex-shrink: 0;
  }

  .nav-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    padding: 7px 16px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
    transition: background 0.1s;
  }
  .nav-btn:hover:not(:disabled) {
    background: var(--color-hover);
  }
  .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .next-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    padding: 7px 16px;
    border-radius: 4px;
    border: none;
    background: var(--color-accent);
    color: #fff;
    cursor: pointer;
    margin-left: auto;
    transition: opacity 0.1s;
  }
  .next-btn:hover {
    opacity: 0.9;
  }

  .dispatch-btn {
    margin-left: auto;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    padding: 7px 16px;
    border-radius: 4px;
    border: none;
    background: var(--color-accent);
    color: #fff;
    cursor: pointer;
    transition: opacity 0.1s;
  }
  .dispatch-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
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
  .close-after-btn:hover {
    background: var(--color-hover);
  }
</style>
