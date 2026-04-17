<script lang="ts">
  import type { PageProps } from './$types';
  import type { NormalizedAction, NormalizedActionRun } from '@agents/core/git';
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { useDebounce } from 'runed';
  import { dispatchAction, listWorkflowRuns } from '$lib/features/git/api/repo.remote';
  import EmptyState from '$lib/ui/EmptyState.svelte';

  let { data }: PageProps = $props();

  const { provider, org, repo } = page.params;

  let selectedWorkflow = $state<NormalizedAction | null>(null);
  let ref = $state(untrack(() => data.defaultBranch));
  let inputPairs = $state<{ key: string; value: string }[]>([]);
  let status = $state<'idle' | 'running' | 'done' | 'error'>('idle');
  let errorMsg = $state('');
  let runs = $state<NormalizedActionRun[]>([]);
  let runsLoading = $state(false);
  let inputsOpen = $state(false);

  const delayedReload = useDebounce(() => loadRuns(), 2000);

  async function selectWorkflow(wf: NormalizedAction) {
    selectedWorkflow = wf;
    status = 'idle';
    errorMsg = '';
    inputPairs = [];
    ref = data.defaultBranch;
    await loadRuns();
  }

  async function loadRuns() {
    if (!selectedWorkflow || !provider || !org || !repo) return;
    runsLoading = true;
    try {
      runs = await listWorkflowRuns({
        provider,
        organization: org,
        repo,
        workflow_id: selectedWorkflow.id,
      });
    } catch {
      runs = [];
    } finally {
      runsLoading = false;
    }
  }

  async function run() {
    if (!selectedWorkflow || !provider || !org || !repo) return;
    const inputs: Record<string, string> = {};
    for (const { key, value } of inputPairs) {
      if (key.trim()) inputs[key.trim()] = value;
    }

    status = 'running';
    errorMsg = '';
    try {
      const workflowFile = selectedWorkflow.path.split('/').pop() ?? selectedWorkflow.id;
      await dispatchAction({
        provider,
        organization: org,
        repo,
        workflow_id: workflowFile,
        ref,
        inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
      });
      status = 'done';
      delayedReload();
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to dispatch workflow';
      status = 'error';
    }
  }

  function addInput() {
    inputPairs = [...inputPairs, { key: '', value: '' }];
  }

  function removeInput(i: number) {
    inputPairs = inputPairs.filter((_, idx) => idx !== i);
  }

  function statusDotClass(r: NormalizedActionRun): string {
    if (r.status === 'in_progress' || r.status === 'queued') return 'animate-pulse';
    return '';
  }

  function statusDotStyle(r: NormalizedActionRun): string {
    if (r.status === 'in_progress') return 'background: var(--color-accent);';
    if (r.status === 'queued') return 'background: var(--color-dim);';
    if (r.conclusion === 'success') return 'background: var(--color-success);';
    if (r.conclusion === 'failure') return 'background: var(--color-danger);';
    if (r.conclusion === 'cancelled' || r.conclusion === 'skipped') return 'background: var(--color-dim);';
    return 'background: var(--color-dim);';
  }

  function statusLabel(r: NormalizedActionRun): string {
    if (r.status === 'in_progress') return 'Running';
    if (r.status === 'queued') return 'Queued';
    if (!r.conclusion) return r.status;
    return r.conclusion.charAt(0).toUpperCase() + r.conclusion.slice(1);
  }

  function relativeTime(date: Date | string): string {
    const ts = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
</script>

<div class="layout">
  <aside class="sidebar">
    <p class="sidebar-label">Workflows</p>

    {#if data.workflows.length === 0}
      <EmptyState icon="workflows" title="No workflows" description="Add workflow files to your repository." />
    {:else}
      <ul class="wf-list">
        {#each data.workflows as wf (wf.id)}
          <li>
            <button
              type="button"
              onclick={() => selectWorkflow(wf)}
              title={wf.path}
              class="wf-btn"
              class:wf-btn-active={selectedWorkflow?.id === wf.id}
            >
              <span class="wf-name">{wf.name}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>

  <div class="main">
    {#if !selectedWorkflow}
      <EmptyState icon="actions" title="Select a workflow" description="Choose a workflow to view its history and dispatch runs." />
    {:else}
      <div class="dispatch-card">
        <div class="dispatch-header">
          <span class="wf-title">{selectedWorkflow.name}</span>
          <span class="wf-path">{selectedWorkflow.path}</span>
          <button
            type="button"
            onclick={run}
            disabled={status === 'running'}
            class="run-btn"
          >
            {status === 'running' ? 'Dispatching…' : 'Run workflow'}
          </button>
        </div>

        <div class="ref-row">
          <span class="ref-label">Ref:</span>
          <input bind:value={ref} class="action-input ref-input" />
        </div>

        <div>
          <button
            type="button"
            onclick={() => (inputsOpen = !inputsOpen)}
            class="action-link inputs-toggle"
          >
            <span class="caret">{inputsOpen ? '▾' : '▸'}</span>
            Inputs ({inputPairs.length})
          </button>

          {#if inputsOpen}
            <div class="inputs-list">
              {#if inputPairs.length === 0}
                <p class="hint">No inputs — click Add to pass key/value pairs.</p>
              {:else}
                {#each inputPairs as pair, i (i)}
                  <div class="input-row">
                    <input bind:value={pair.key} placeholder="key" class="action-input key-input" />
                    <input bind:value={pair.value} placeholder="value" class="action-input val-input" />
                    <button type="button" onclick={() => removeInput(i)} class="remove-btn" aria-label="Remove input">✕</button>
                  </div>
                {/each}
              {/if}
              <button type="button" onclick={addInput} class="add-btn">+ Add</button>
            </div>
          {/if}
        </div>

        {#if status === 'done'}
          <p class="status-msg status-ok">Workflow dispatched — run will appear in history shortly.</p>
        {:else if status === 'error'}
          <p class="status-msg status-err">{errorMsg}</p>
        {/if}
      </div>

      <div>
        <div class="history-header">
          <span class="history-title">Run history</span>
          <button type="button" onclick={loadRuns} class="action-link">↻ Refresh</button>
        </div>

        {#if runsLoading}
          <p class="hint">Loading…</p>
        {:else if runs.length === 0}
          <EmptyState icon="actions" title="No runs found" description="Dispatch the workflow to see run history." />
        {:else}
          <div class="runs-list">
            {#each runs as r, idx (r.id)}
              <div class="run-row" style={idx === 0 ? '' : 'border-top: 1px solid var(--color-border);'}>
                <span class="status-dot {statusDotClass(r)}" style={statusDotStyle(r)}></span>
                <span class="run-name">{r.name}</span>
                <span class="run-meta branch" title={r.branch}>{r.branch}</span>
                <span class="run-meta time">{relativeTime(r.createdAt)}</span>
                <span class="run-meta status-label">{statusLabel(r)}</span>
                <a href={r.url} target="_blank" rel="noopener noreferrer" class="run-link">#{r.id}</a>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .layout {
    display: flex;
    gap: 0;
    min-height: 0;
  }

  .sidebar {
    flex-shrink: 0;
    width: 180px;
    padding-right: 16px;
    border-right: 1px solid var(--color-border);
  }

  .sidebar-label {
    margin-bottom: 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
  }

  .wf-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .wf-btn {
    display: block;
    width: 100%;
    padding: 6px 10px;
    font-size: 13px;
    text-align: left;
    border-left: 2px solid transparent;
    background: transparent;
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
    color: var(--color-muted);
    cursor: pointer;
  }
  .wf-btn:hover {
    color: var(--color-text);
    background: var(--color-hover);
  }
  .wf-btn-active {
    border-left-color: var(--color-accent);
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .wf-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .main {
    flex: 1;
    min-width: 0;
    padding-left: 20px;
  }

  .dispatch-card {
    margin-bottom: 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 16px;
    border-radius: 4px;
  }

  .dispatch-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .wf-title {
    font-weight: 500;
    font-size: 13px;
    color: var(--color-text);
  }

  .wf-path {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .run-btn {
    flex-shrink: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 6px 12px;
    min-height: 32px;
    background: var(--color-accent);
    border-radius: 3px;
    border: none;
    color: white;
    cursor: pointer;
  }
  .run-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ref-row {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ref-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-muted);
  }

  .action-input {
    padding: 5px 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    outline: none;
  }
  .action-input:focus {
    border-color: var(--color-accent);
  }

  .ref-input {
    width: 160px;
  }

  .inputs-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }

  .caret {
    font-size: 10px;
  }

  .inputs-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .hint {
    font-size: 12px;
    color: var(--color-dim);
  }

  .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .key-input {
    width: 120px;
  }

  .val-input {
    flex: 1;
  }

  .action-link {
    color: var(--color-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
  }
  .action-link:hover {
    color: var(--color-text);
  }

  .remove-btn {
    color: var(--color-dim);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 4px;
    font-size: 12px;
  }
  .remove-btn:hover {
    color: var(--color-danger);
  }

  .add-btn {
    color: var(--color-accent);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: 12px;
    align-self: flex-start;
  }
  .add-btn:hover {
    opacity: 0.75;
  }

  .status-msg {
    margin-top: 12px;
    font-size: 12px;
  }
  .status-ok {
    color: var(--color-success);
  }
  .status-err {
    color: var(--color-danger);
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .history-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text);
  }

  .runs-list {
    overflow: hidden;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .run-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    min-height: 32px;
  }
  .run-row:hover {
    background: var(--color-hover);
  }

  .status-dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .run-name {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .run-meta {
    flex-shrink: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .branch {
    max-width: 140px;
  }

  .time {
    width: 64px;
    text-align: right;
  }

  .status-label {
    width: 72px;
    text-align: right;
    color: var(--color-muted);
  }

  .run-link {
    flex-shrink: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-decoration: none;
  }
  .run-link:hover {
    color: var(--color-accent);
  }

  @media (max-width: 900px) {
    .layout {
      flex-direction: column;
    }

    .sidebar {
      width: auto;
      padding-right: 0;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .wf-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .wf-btn {
      width: auto;
      padding: 6px 10px;
      border-left: none;
      border: 1px solid var(--color-border);
      border-radius: 3px;
    }

    .wf-btn-active {
      border-color: var(--color-accent);
    }

    .main {
      padding-left: 0;
    }

    .run-row {
      flex-wrap: wrap;
      min-height: auto;
      padding: 10px 12px;
    }

    .branch {
      max-width: 120px;
    }

    .time,
    .status-label {
      width: auto;
    }
  }
</style>
