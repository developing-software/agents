<script lang="ts">
  import type { PageProps } from './$types';
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { dispatchAction, listWorkflowRuns } from '../repo.remote';

  let { data }: PageProps = $props();

  const { organization, repo } = page.params;

  type Workflow = (typeof data.workflows)[0];
  type Run = Awaited<ReturnType<typeof listWorkflowRuns>>[0];

  let selectedWorkflow = $state<Workflow | null>(null);
  let ref = $state(untrack(() => data.defaultBranch));
  let inputPairs = $state<{ key: string; value: string }[]>([]);
  let status = $state<'idle' | 'running' | 'done' | 'error'>('idle');
  let errorMsg = $state('');

  let runs = $state<Run[]>([]);
  let runsLoading = $state(false);

  async function selectWorkflow(wf: Workflow) {
    selectedWorkflow = wf;
    status = 'idle';
    errorMsg = '';
    inputPairs = [];
    ref = data.defaultBranch;
    await loadRuns();
  }

  async function loadRuns() {
    if (!selectedWorkflow) return;
    runsLoading = true;
    try {
      runs = await listWorkflowRuns({ organization, repo, workflow_id: selectedWorkflow.id });
    } catch {
      runs = [];
    } finally {
      runsLoading = false;
    }
  }

  async function run() {
    if (!selectedWorkflow) return;
    const inputs: Record<string, string> = {};
    for (const { key, value } of inputPairs) {
      if (key.trim()) inputs[key.trim()] = value;
    }

    status = 'running';
    errorMsg = '';
    try {
      const workflowFile = selectedWorkflow.path.split('/').pop()!;
      await dispatchAction({
        organization,
        repo,
        workflow_id: workflowFile,
        ref,
        inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
      });
      status = 'done';
      setTimeout(loadRuns, 2000);
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

  function statusDot(s: string | null, conclusion: string | null): string {
    if (s === 'in_progress') return 'bg-blue-400 animate-pulse';
    if (s === 'queued') return 'bg-gray-500 animate-pulse';
    if (conclusion === 'success') return 'bg-green-500';
    if (conclusion === 'failure') return 'bg-red-500';
    if (conclusion === 'cancelled' || conclusion === 'skipped') return 'bg-gray-600';
    if (conclusion === 'timed_out') return 'bg-orange-500';
    return 'bg-gray-600';
  }

  function statusLabel(s: string | null, conclusion: string | null): string {
    if (s === 'in_progress') return 'Running';
    if (s === 'queued') return 'Queued';
    if (!conclusion) return s ?? '';
    return conclusion.charAt(0).toUpperCase() + conclusion.slice(1).replace(/_/g, ' ');
  }

  function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
</script>

<div class="flex gap-6">
  <!-- Sidebar: workflow list -->
  <div class="w-52 shrink-0">
    <h2 class="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Workflows</h2>
    {#if data.workflows.length === 0}
      <p class="text-sm text-gray-500">No workflows found.</p>
    {:else}
      <ul class="space-y-1">
        {#each data.workflows as wf}
          <li>
            <button
              onclick={() => selectWorkflow(wf)}
              class="w-full rounded-md px-3 py-2 text-left transition-colors {selectedWorkflow?.id === wf.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
            >
              <span class="block truncate text-sm font-medium">{wf.name}</span>
              <span class="block truncate text-xs text-gray-500">{wf.path}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Main content -->
  <div class="min-w-0 flex-1">
    {#if !selectedWorkflow}
      <div class="flex h-48 items-center justify-center rounded-lg border border-gray-800 text-sm text-gray-500">
        Select a workflow to view its run history and dispatch it
      </div>
    {:else}
      <!-- Dispatch form -->
      <div class="mb-6 rounded-lg border border-gray-800 p-5">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="font-semibold text-white">{selectedWorkflow.name}</h2>
            <p class="mt-0.5 text-xs text-gray-500">{selectedWorkflow.path}</p>
          </div>
          <button
            onclick={run}
            disabled={status === 'running'}
            class="shrink-0 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {status === 'running' ? 'Dispatching…' : 'Run workflow'}
          </button>
        </div>

        <div class="mb-4 w-64">
          <label class="mb-1 block text-xs text-gray-400" for="ref">Branch / tag / SHA</label>
          <input
            id="ref"
            bind:value={ref}
            class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs text-gray-400">Inputs</span>
            <button onclick={addInput} class="text-xs text-blue-400 hover:text-blue-300">
              + Add input
            </button>
          </div>
          {#if inputPairs.length === 0}
            <p class="text-xs text-gray-600">No inputs — click "Add input" to pass key/value pairs to the workflow.</p>
          {:else}
            <div class="space-y-2">
              {#each inputPairs as pair, i}
                <div class="flex gap-2">
                  <input
                    bind:value={pair.key}
                    placeholder="key"
                    class="w-1/3 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    bind:value={pair.value}
                    placeholder="value"
                    class="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onclick={() => removeInput(i)}
                    class="px-1 text-gray-600 hover:text-red-400"
                    aria-label="Remove input"
                  >
                    ✕
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        {#if status === 'done'}
          <p class="mt-3 text-sm text-green-400">Workflow dispatched — run will appear in history shortly.</p>
        {:else if status === 'error'}
          <p class="mt-3 text-sm text-red-400">{errorMsg}</p>
        {/if}
      </div>

      <!-- Run history -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-300">Run history</h3>
          <button onclick={loadRuns} class="text-xs text-gray-500 hover:text-gray-300">
            Refresh
          </button>
        </div>

        {#if runsLoading}
          <p class="text-sm text-gray-500">Loading…</p>
        {:else if runs.length === 0}
          <p class="text-sm text-gray-500">No runs found for this workflow.</p>
        {:else}
          <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
            {#each runs as run}
              <li class="flex items-center gap-3 px-4 py-3">
                <span
                  class="mt-0.5 h-2 w-2 shrink-0 rounded-full {statusDot(run.status, run.conclusion)}"
                ></span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-gray-100">
                    {run.commitMessage || '(no commit message)'}
                  </p>
                  <p class="mt-0.5 text-xs text-gray-500">
                    <code class="text-gray-400">{run.headBranch}</code>
                    · {run.actor}
                    · {relativeTime(run.createdAt)}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <span class="text-xs text-gray-400">
                    {statusLabel(run.status, run.conclusion)}
                  </span>
                  <a
                    href={run.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-0.5 block text-xs text-gray-600 hover:text-gray-400"
                  >
                    #{run.id}
                  </a>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </div>
</div>
