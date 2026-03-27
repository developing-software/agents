<script lang="ts">
  import type { PageProps } from './$types';
  import type { GithubWorkflow } from "@agents/core/github/repo/workflow";
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { dispatchAction, listWorkflowRuns } from '../repo.remote';

  let { data }: PageProps = $props();

  const { organization, repo } = page.params;

  let selectedWorkflow = $state<GithubWorkflow.Info | null>(null);
  let ref = $state(untrack(() => data.defaultBranch));
  let inputPairs = $state<{ key: string; value: string }[]>([]);
  let status = $state<'idle' | 'running' | 'done' | 'error'>('idle');
  let errorMsg = $state('');
  let runs = $state<GithubWorkflow.Run.Info[]>([]);
  let runsLoading = $state(false);

  async function selectWorkflow(wf: GithubWorkflow.Info) {
    selectedWorkflow = wf;
    status = 'idle';
    errorMsg = '';
    inputPairs = [];
    ref = data.defaultBranch;
    await loadRuns();
  }

  async function loadRuns() {
    if (!selectedWorkflow || !organization || !repo) return;
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
    if (!selectedWorkflow || !organization || !repo) return;
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
    if (s === 'in_progress') return 'animate-pulse';
    if (s === 'queued') return 'animate-pulse';
    return '';
  }

  function statusDotStyle(s: string | null, conclusion: string | null): string {
    if (s === 'in_progress') return 'background: var(--color-accent);';
    if (s === 'queued') return 'background: var(--color-dim);';
    if (conclusion === 'success') return 'background: var(--color-success);';
    if (conclusion === 'failure') return 'background: var(--color-danger);';
    if (conclusion === 'cancelled' || conclusion === 'skipped') return 'background: var(--color-dim);';
    if (conclusion === 'timed_out') return 'background: var(--color-warning);';
    return 'background: var(--color-dim);';
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
  <div class="w-56 shrink-0">
    <p
      class="mb-3 font-mono text-xs font-medium uppercase tracking-wider"
      style="color: var(--color-muted);"
    >Workflows</p>

    {#if data.workflows.length === 0}
      <p class="text-sm" style="color: var(--color-muted);">No workflows found.</p>
    {:else}
      <ul class="space-y-0.5">
        {#each data.workflows as wf (wf.id)}
          <li>
            <button
              onclick={() => selectWorkflow(wf)}
              class="w-full rounded-md px-3 py-2 text-left transition-colors"
              style={selectedWorkflow?.id === wf.id
                ? 'background: var(--color-hover); color: var(--color-text); border-left: 2px solid var(--color-accent); padding-left: 10px;'
                : 'background: transparent; color: var(--color-muted); border-left: 2px solid transparent; padding-left: 10px;'}
              onmouseenter={selectedWorkflow?.id !== wf.id
                ? (e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'var(--color-hover)';
                    el.style.color = 'var(--color-text)';
                  }
                : undefined}
              onmouseleave={selectedWorkflow?.id !== wf.id
                ? (e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'transparent';
                    el.style.color = 'var(--color-muted)';
                  }
                : undefined}
            >
              <span class="block truncate text-sm font-medium">{wf.name}</span>
              <span
                class="mt-0.5 block truncate font-mono text-xs"
                style="color: var(--color-muted);"
              >{wf.path}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Main content -->
  <div class="min-w-0 flex-1">
    {#if !selectedWorkflow}
      <div
        class="flex h-48 items-center justify-center rounded-lg border text-sm"
        style="border-color: var(--color-border); color: var(--color-muted);"
      >
        Select a workflow to view its run history and dispatch it
      </div>
    {:else}
      <!-- Dispatch panel -->
      <div
        class="mb-6 rounded-lg border p-5"
        style="background: var(--color-surface); border-color: var(--color-border);"
      >
        <!-- Panel header -->
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="font-semibold" style="color: var(--color-text);">{selectedWorkflow.name}</h2>
            <p class="mt-0.5 font-mono text-xs" style="color: var(--color-muted);">{selectedWorkflow.path}</p>
          </div>
          <button
            onclick={run}
            disabled={status === 'running'}
            class="shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style="background: var(--color-accent);"
          >
            {status === 'running' ? 'Dispatching…' : 'Run workflow'}
          </button>
        </div>

        <!-- Branch input -->
        <div class="mb-4 w-64">
          <label
            class="mb-1 block text-xs"
            style="color: var(--color-muted);"
            for="ref"
          >Branch / tag / SHA</label>
          <input
            id="ref"
            bind:value={ref}
            class="w-full rounded-lg border px-3 py-1.5 font-mono text-sm text-text outline-none transition-colors"
            style="background: var(--color-elevated); border-color: var(--color-border);"
            onfocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)')}
            onblur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
          />
        </div>

        <!-- Inputs section -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs" style="color: var(--color-muted);">Inputs</span>
            <button
              onclick={addInput}
              class="text-xs transition-colors"
              style="color: var(--color-accent);"
              onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.75')}
              onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >＋ Add input</button>
          </div>

          {#if inputPairs.length === 0}
            <p class="text-xs" style="color: var(--color-dim);">
              No inputs — click "Add input" to pass key/value pairs to the workflow.
            </p>
          {:else}
            <div class="space-y-2">
              {#each inputPairs as pair, i (i)}
                <div class="flex gap-2">
                  <input
                    bind:value={pair.key}
                    placeholder="key"
                    class="w-1/3 rounded-lg border px-3 py-1.5 font-mono text-xs text-text outline-none transition-colors"
                    style="background: var(--color-elevated); border-color: var(--color-border);"
                    onfocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)')}
                    onblur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
                  />
                  <input
                    bind:value={pair.value}
                    placeholder="value"
                    class="flex-1 rounded-lg border px-3 py-1.5 font-mono text-xs text-text outline-none transition-colors"
                    style="background: var(--color-elevated); border-color: var(--color-border);"
                    onfocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)')}
                    onblur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
                  />
                  <button
                    onclick={() => removeInput(i)}
                    class="px-2 text-sm transition-colors"
                    style="color: var(--color-dim);"
                    aria-label="Remove input"
                    onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-danger)')}
                    onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-dim)')}
                  >✕</button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Status messages -->
        {#if status === 'done'}
          <p class="mt-3 text-sm" style="color: var(--color-success);">
            Workflow dispatched — run will appear in history shortly.
          </p>
        {:else if status === 'error'}
          <p class="mt-3 text-sm" style="color: var(--color-danger);">{errorMsg}</p>
        {/if}
      </div>

      <!-- Run history -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-medium" style="color: var(--color-text);">Run history</h3>
          <button
            onclick={loadRuns}
            class="text-xs transition-colors"
            style="color: var(--color-muted);"
            onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
            onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')}
          >↻ Refresh</button>
        </div>

        {#if runsLoading}
          <p class="text-sm" style="color: var(--color-muted);">Loading…</p>
        {:else if runs.length === 0}
          <p class="text-sm" style="color: var(--color-muted);">No runs found for this workflow.</p>
        {:else}
          <ul
            class="overflow-hidden rounded-lg border"
            style="background: var(--color-surface); border-color: var(--color-border);"
          >
            {#each runs as run (run.id)}
              <li
                class="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                style="border-color: var(--color-border);"
              >
                <!-- Status dot -->
                <span
                  class="mt-0.5 h-2 w-2 shrink-0 rounded-full {statusDot(run.status, run.conclusion)}"
                  style={statusDotStyle(run.status, run.conclusion)}
                ></span>

                <!-- Commit info -->
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm" style="color: var(--color-text);">
                    {run.commitMessage || '(no commit message)'}
                  </p>
                  <p class="mt-0.5 font-mono text-xs" style="color: var(--color-muted);">
                    {run.headBranch} · {run.actor} · {relativeTime(run.createdAt)}
                  </p>
                </div>

                <!-- Status label + run link -->
                <div class="shrink-0 text-right">
                  <span class="text-xs" style="color: var(--color-muted);">
                    {statusLabel(run.status, run.conclusion)}
                  </span>
                  <a
                    href={run.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-0.5 block font-mono text-xs transition-colors"
                    style="color: var(--color-dim);"
                    onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-accent)')}
                    onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-dim)')}
                  >#{run.id}</a>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </div>
</div>
