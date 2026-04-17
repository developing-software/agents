<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import Section from '../components/Section.svelte';
  import SummaryView from '../components/metrics/SummaryView.svelte';
  import { getEventSummary, invalidateSummaryCache } from '../api/metrics.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  const { organization, repoName } = repoContext.get();

  const summary = getEventSummary({ organization, repoName });

  async function refresh() {
    await invalidateSummaryCache({ organization, repoName });
    summary.refresh();
  }
</script>

<Section title="Summary" cachedAt={summary.current?.cachedAt ?? null} loading={summary.loading} onrefresh={refresh}>
  <QueryLoader query={summary}>
    {#snippet loading()}
      <div class="stat-row">
        {#each [1, 2, 3, 4, 5, 6] as i (i)}
          <div class="stat-card">
            <div class="skeleton-label"></div>
            <div class="skeleton-value"></div>
          </div>
        {/each}
      </div>
    {/snippet}
    {#snippet error(_)}
      <p class="empty">Failed to load summary</p>
    {/snippet}
    {#snippet children(data)}
      {#if data.data}
        <SummaryView summary={data.data} />
      {:else}
        <p class="empty">No data available</p>
      {/if}
    {/snippet}
  </QueryLoader>
</Section>

<style>
  .stat-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .stat-card {
    flex: 1;
    min-width: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .skeleton-label { width: 48px; height: 10px; background: var(--color-elevated); border-radius: 2px; animation: pulse 1.4s ease-in-out infinite; }
  .skeleton-value { width: 56px; height: 16px; background: var(--color-elevated); border-radius: 2px; animation: pulse 1.4s ease-in-out infinite; }
  .empty { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--color-dim); padding: 20px 0; text-align: center; margin: 0; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
