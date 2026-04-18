<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { listAgentRuns } from '../api/metrics.remote';
  import AgentRunsTable from '../components/AgentRunsTable.svelte';
  import { repoContext } from '$lib/features/git/context.svelte';

  const repo = repoContext.get();

  const runsQuery = $derived(listAgentRuns({ organization: repo.organization, repoName: repo.repoName }));
</script>

<h2 class="section-heading">Agent Runs</h2>

<QueryLoader query={runsQuery}>
  {#snippet loading()}
    <div class="skeleton-table">
      {#each [1, 2, 3] as i (i)}
        <div class="skeleton-row">
          <div class="skeleton-block" style="width:7px;height:7px;border-radius:50%;"></div>
          <div class="skeleton-block" style="width:56px;height:13px;"></div>
          <div class="skeleton-block" style="width:120px;height:11px;"></div>
          <div class="skeleton-block" style="width:44px;height:11px;"></div>
          <div class="skeleton-block" style="width:48px;height:11px;"></div>
          <div class="skeleton-block" style="width:90px;height:11px;"></div>
          <div class="skeleton-block" style="width:36px;height:16px;border-radius:3px;"></div>
          <div class="skeleton-block" style="width:40px;height:11px;margin-left:auto;"></div>
        </div>
      {/each}
    </div>
  {/snippet}
  {#snippet empty()}
    <EmptyState icon="agents" title="No agent runs recorded" description="Runs will appear here when agents are triggered via GitHub Actions or CLI." />
  {/snippet}
  {#snippet children(runs)}
    <AgentRunsTable {runs} />
  {/snippet}
</QueryLoader>

<style>
  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  .skeleton-table {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
  }

  .skeleton-block {
    background: var(--color-elevated);
    border-radius: 3px;
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
