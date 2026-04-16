<script lang="ts">
  import type { PageProps } from './$types';
  import PlanForm from '$lib/agents/plans/PlanForm.svelte';

  let { data }: PageProps = $props();
</script>

<div class="header">
  <a href="/{data.provider}/{data.organization}/{data.repoName}/agents/plans" class="back">← Plans</a>
  <span class="title">New Plan</span>
</div>

{#if data.repo}
  <PlanForm repoId={data.repo.id} />
{:else}
  <div class="not-found">Repository not found.</div>
{/if}

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .back {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-decoration: none;
    flex-shrink: 0;
  }
  .back:hover {
    color: var(--color-muted);
  }

  .title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
  }

  .not-found {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-muted);
    padding: 12px;
    border: 1px dashed var(--color-border);
    border-radius: 4px;
  }
</style>
