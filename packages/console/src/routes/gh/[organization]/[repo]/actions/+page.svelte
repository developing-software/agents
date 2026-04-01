<script lang="ts">
  import type { PageProps } from './$types';
  import type { GithubWorkflow } from "@agents/core/github/repo/workflow";
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { dispatchAction, listWorkflowRuns } from '../repo.remote';
  import EmptyState from '$lib/EmptyState.svelte';

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

  let inputsOpen = $state(false);
</script>

<div class="flex gap-0" style="min-height: 0;">
  <!-- Left sidebar: workflow list (180px fixed) -->
  <div
    class="shrink-0 pr-4"
    style="width: 180px; border-right: 1px solid var(--color-border);"
  >
    <p
      class="mb-2 font-mono uppercase tracking-wider"
      style="font-size: 11px; color: var(--color-dim);"
    >Workflows</p>

    {#if data.workflows.length === 0}
      <EmptyState icon="workflows" title="No workflows" description="Add GitHub Actions workflow files to your repository." />
    {:else}
      <ul>
        {#each data.workflows as wf (wf.id)}
          <li>
            <button
              onclick={() => selectWorkflow(wf)}
              title={wf.path}
              class="w-full text-left transition-colors"
              style="
                display: block;
                padding: 6px 10px;
                font-size: 13px;
                border-left: 2px solid {selectedWorkflow?.id === wf.id ? 'var(--color-accent)' : 'transparent'};
                background: {selectedWorkflow?.id === wf.id ? 'var(--color-elevated)' : 'transparent'};
                color: {selectedWorkflow?.id === wf.id ? 'var(--color-text)' : 'var(--color-muted)'};
              "
              onmouseenter={selectedWorkflow?.id !== wf.id
                ? (e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = 'var(--color-text)';
                    el.style.background = 'var(--color-hover)';
                  }
                : undefined}
              onmouseleave={selectedWorkflow?.id !== wf.id
                ? (e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = 'var(--color-muted)';
                    el.style.background = 'transparent';
                  }
                : undefined}
            >
              <span class="block truncate">{wf.name}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Main panel -->
  <div class="min-w-0 flex-1 pl-5">
    {#if !selectedWorkflow}
      <EmptyState icon="actions" title="Select a workflow" description="Choose a workflow from the sidebar to view its history and dispatch runs." />
    {:else}
      <!-- Dispatch card -->
      <div
        class="mb-5 rounded"
        style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 16px;"
      >
        <!-- Top row: name + path + run button -->
        <div class="mb-4 flex items-center gap-3">
          <span class="font-medium" style="font-size: 13px; color: var(--color-text);">
            {selectedWorkflow.name}
          </span>
          <span class="font-mono" style="font-size: 11px; color: var(--color-dim);">
            {selectedWorkflow.path}
          </span>
          <div class="flex-1"></div>
          <button
            onclick={run}
            disabled={status === 'running'}
            class="shrink-0 font-mono text-white transition-opacity disabled:opacity-50"
            style="font-size: 11px; padding: 4px 10px; background: var(--color-accent); border-radius: 3px; border: none; cursor: pointer;"
          >
            {status === 'running' ? 'Dispatching…' : 'Run workflow'}
          </button>
        </div>

        <!-- Ref row -->
        <div class="mb-3 flex items-center gap-2">
          <span class="font-mono text-xs" style="color: var(--color-muted);">Ref:</span>
          <input
            bind:value={ref}
            class="font-mono text-xs outline-none transition-colors"
            style="
              width: 160px;
              padding: 3px 8px;
              background: var(--color-elevated);
              border: 1px solid var(--color-border);
              border-radius: 3px;
              color: var(--color-text);
            "
            onfocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)')}
            onblur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
          />
        </div>

        <!-- Inputs collapsible -->
        <div>
          <button
            onclick={() => (inputsOpen = !inputsOpen)}
            class="flex items-center gap-1 text-xs transition-colors"
            style="color: var(--color-muted); background: none; border: none; cursor: pointer; padding: 0;"
            onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
            onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')}
          >
            <span style="font-size: 10px;">{inputsOpen ? '▾' : '▸'}</span>
            Inputs ({inputPairs.length})
          </button>

          {#if inputsOpen}
            <div class="mt-2 space-y-1.5">
              {#if inputPairs.length === 0}
                <p class="text-xs" style="color: var(--color-dim);">No inputs — click Add to pass key/value pairs.</p>
              {:else}
                {#each inputPairs as pair, i (i)}
                  <div class="flex gap-2">
                    <input
                      bind:value={pair.key}
                      placeholder="key"
                      class="font-mono text-xs outline-none transition-colors"
                      style="
                        width: 120px;
                        padding: 3px 8px;
                        background: var(--color-elevated);
                        border: 1px solid var(--color-border);
                        border-radius: 3px;
                        color: var(--color-text);
                      "
                      onfocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)')}
                      onblur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
                    />
                    <input
                      bind:value={pair.value}
                      placeholder="value"
                      class="font-mono text-xs outline-none transition-colors"
                      style="
                        flex: 1;
                        padding: 3px 8px;
                        background: var(--color-elevated);
                        border: 1px solid var(--color-border);
                        border-radius: 3px;
                        color: var(--color-text);
                      "
                      onfocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)')}
                      onblur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
                    />
                    <button
                      onclick={() => removeInput(i)}
                      class="text-xs transition-colors"
                      style="color: var(--color-dim); background: none; border: none; cursor: pointer; padding: 0 4px;"
                      aria-label="Remove input"
                      onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-danger)')}
                      onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-dim)')}
                    >✕</button>
                  </div>
                {/each}
              {/if}
              <button
                onclick={addInput}
                class="mt-1 text-xs transition-colors"
                style="color: var(--color-accent); background: none; border: none; cursor: pointer; padding: 0;"
                onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.75')}
                onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >+ Add</button>
            </div>
          {/if}
        </div>

        <!-- Status messages -->
        {#if status === 'done'}
          <p class="mt-3 text-xs" style="color: var(--color-success);">
            Workflow dispatched — run will appear in history shortly.
          </p>
        {:else if status === 'error'}
          <p class="mt-3 text-xs" style="color: var(--color-danger);">{errorMsg}</p>
        {/if}
      </div>

      <!-- Run history -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium" style="color: var(--color-text);">Run history</span>
          <button
            onclick={loadRuns}
            class="font-mono text-xs transition-colors"
            style="color: var(--color-muted); background: none; border: none; cursor: pointer; padding: 0;"
            onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
            onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')}
          >↻ Refresh</button>
        </div>

        {#if runsLoading}
          <p class="text-xs" style="color: var(--color-muted);">Loading…</p>
        {:else if runs.length === 0}
          <EmptyState icon="actions" title="No runs found" description="Dispatch the workflow to see run history." />
        {:else}
          <div
            class="overflow-hidden rounded"
            style="border: 1px solid var(--color-border); background: var(--color-surface);"
          >
            {#each runs as run, idx (run.id)}
              <div
                class="flex items-center gap-3 px-3"
                style="height: 26px; border-top: {idx === 0 ? 'none' : '1px solid var(--color-border)'};"
                onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-hover)')}
                onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                role="listitem"
              >
                <!-- Status dot -->
                <span
                  class="h-1.5 w-1.5 shrink-0 rounded-full {statusDot(run.status, run.conclusion)}"
                  style={statusDotStyle(run.status, run.conclusion)}
                ></span>

                <!-- Commit message -->
                <span
                  class="min-w-0 flex-1 truncate text-xs"
                  style="color: var(--color-text);"
                >{run.commitMessage || '(no commit message)'}</span>

                <!-- Branch -->
                <span
                  class="shrink-0 font-mono"
                  style="font-size: 11px; color: var(--color-dim); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                >{run.headBranch}</span>

                <!-- Actor -->
                <span
                  class="shrink-0 font-mono"
                  style="font-size: 11px; color: var(--color-dim); max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                >{run.actor}</span>

                <!-- Time -->
                <span
                  class="shrink-0 font-mono text-right"
                  style="font-size: 11px; color: var(--color-dim); width: 60px;"
                >{relativeTime(run.createdAt)}</span>

                <!-- Status label -->
                <span
                  class="shrink-0 font-mono text-right"
                  style="font-size: 10px; width: 56px; color: var(--color-muted);"
                >{statusLabel(run.status, run.conclusion)}</span>

                <!-- Run ID link -->
                <a
                  href={run.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="shrink-0 font-mono transition-colors"
                  style="font-size: 11px; color: var(--color-dim); text-decoration: none;"
                  onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-accent)')}
                  onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-dim)')}
                >#{run.id}</a>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
