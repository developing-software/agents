<script lang="ts">
  import Section from '../Section.svelte';
  import SummaryView from './SummaryView.svelte';
  import { getEventSummary, invalidateSummaryCache } from '../../api/metrics.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  const { organization, repoName } = repoContext.get();

  const summary = getEventSummary({ organization, repoName });

  async function refresh() {
    await invalidateSummaryCache({ organization, repoName });
    summary.refresh();
  }
</script>

{#if summary.loading && !summary.current}
  <Section title="Summary" cachedAt={null} loading={true} onrefresh={refresh}>
    <div class="stat-row">
      {#each [1, 2, 3, 4, 5, 6] as i (i)}
        <div class="stat-card">
          <div class="skeleton-label"></div>
          <div class="skeleton-value"></div>
        </div>
      {/each}
    </div>
  </Section>
{:else if summary.error}
  <Section
    title="Summary"
    cachedAt={summary.current?.cachedAt ?? null}
    loading={summary.loading}
    onrefresh={refresh}
  >
    <p class="empty">Failed to load summary</p>
  </Section>
{:else}
  <Section
    title="Summary"
    cachedAt={summary.current?.cachedAt ?? null}
    loading={summary.loading}
    onrefresh={refresh}
  >
    {#if summary.current?.data}
      <SummaryView summary={summary.current.data} />
    {:else}
      <p class="empty">No data available</p>
    {/if}
  </Section>
{/if}

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
