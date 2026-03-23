<script lang="ts">
  import { page } from '$app/state';
  import { dispatchAction } from '../repo.remote';

  let { data } = $props();

  const { organization, repo } = page.params;

  let workflowId = $state('implement.yml');
  let ref = $state(data.defaultBranch);
  let inputsJson = $state('{}');
  let status = $state<'idle' | 'running' | 'done' | 'error'>('idle');
  let errorMsg = $state('');

  async function run() {
    let inputs: Record<string, string> = {};
    try {
      inputs = JSON.parse(inputsJson);
    } catch {
      errorMsg = 'Inputs must be valid JSON';
      status = 'error';
      return;
    }

    status = 'running';
    errorMsg = '';
    try {
      await dispatchAction({ organization, repo, workflow_id: workflowId, ref, inputs });
      status = 'done';
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to dispatch workflow';
      status = 'error';
    }
  }
</script>

<div class="max-w-lg">
  <h1 class="mb-6 text-lg font-semibold">Run Workflow</h1>

  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm text-gray-400" for="workflow">Workflow file</label>
      <input
        id="workflow"
        bind:value={workflowId}
        class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        placeholder="implement.yml"
      />
    </div>

    <div>
      <label class="mb-1 block text-sm text-gray-400" for="ref">Branch / tag / SHA</label>
      <input
        id="ref"
        bind:value={ref}
        class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
      />
    </div>

    <div>
      <label class="mb-1 block text-sm text-gray-400" for="inputs">
        Inputs <span class="text-gray-600">(JSON)</span>
      </label>
      <textarea
        id="inputs"
        bind:value={inputsJson}
        rows="4"
        class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
      ></textarea>
    </div>

    <button
      onclick={run}
      disabled={status === 'running'}
      class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
    >
      {status === 'running' ? 'Dispatching…' : 'Run workflow'}
    </button>

    {#if status === 'done'}
      <p class="text-sm text-green-400">Workflow dispatched successfully.</p>
    {:else if status === 'error'}
      <p class="text-sm text-red-400">{errorMsg}</p>
    {/if}
  </div>
</div>
