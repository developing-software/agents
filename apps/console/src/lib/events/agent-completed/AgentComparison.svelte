<script lang="ts">
  import { resource } from 'runed';
  import Section from '../Section.svelte';
  import ComparisonView from './ComparisonView.svelte';
  import { getAgentComparison, getAgentStats, invalidateComparisonCache } from './agent-completed.remote';

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  let isRefreshing = $state(false);

  const comparison = resource(
    [() => organization, () => repoName],
    async ([organization, repoName]) => {
      const [comparison, stats] = await Promise.all([
        getAgentComparison({ organization, repoName }),
        getAgentStats({ organization, repoName }),
      ]);

      return { comparison, stats };
    },
  );

  async function refresh() {
    isRefreshing = true;
    try {
      await invalidateComparisonCache({ organization, repoName });
      await comparison.refetch();
    } finally {
      isRefreshing = false;
    }
  }
</script>

{#if comparison.loading && !comparison.current}
  <Section title="Agents" cachedAt={null} loading={true} onrefresh={refresh}>
    <div class="cards">
      {#each [1, 2] as i (i)}
        <div class="agent-card">
          <div class="skel-header">
            <div class="skel-dot"></div>
            <div class="skel-name"></div>
            <div class="skel-badge"></div>
          </div>
          <div class="skel-pills">
            <div class="skel-pill"></div>
            <div class="skel-pill short"></div>
          </div>
          <div class="skel-grid">
            {#each [1, 2, 3, 4] as j (j)}
              <div class="skel-metric">
                <div class="skel-label"></div>
                <div class="skel-value"></div>
                <div class="skel-avg"></div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </Section>
{:else if comparison.error}
  <Section
    title="Agents"
    cachedAt={comparison.current?.comparison.cachedAt ?? null}
    loading={isRefreshing || comparison.loading}
    onrefresh={refresh}
  >
    <p class="empty">Failed to load agent data</p>
  </Section>
{:else}
  <Section
    title="Agents"
    cachedAt={comparison.current?.comparison.cachedAt ?? null}
    loading={isRefreshing || comparison.loading}
    onrefresh={refresh}
  >
    <div class="scroll-container">
      <ComparisonView
        agents={comparison.current?.comparison.data ?? []}
        stats={comparison.current?.stats.data ?? []}
      />
    </div>
  </Section>
{/if}

<style>
  .scroll-container {
    max-height: 600px;
    overflow-y: auto;
  }
  .cards { display: flex; flex-wrap: wrap; gap: 8px; }
  .agent-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 12px 14px;
    flex: 1;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .skel-header { display: flex; align-items: center; gap: 6px; }
  .skel-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-elevated); animation: pulse 1.4s ease-in-out infinite; }
  .skel-name { width: 60px; height: 13px; border-radius: 2px; background: var(--color-elevated); animation: pulse 1.4s ease-in-out infinite; }
  .skel-badge { margin-left: auto; width: 36px; height: 10px; border-radius: 2px; background: var(--color-elevated); animation: pulse 1.4s ease-in-out infinite; }
  .skel-pills { display: flex; gap: 4px; }
  .skel-pill { width: 80px; height: 14px; border-radius: 3px; background: var(--color-elevated); animation: pulse 1.4s ease-in-out infinite; }
  .skel-pill.short { width: 56px; }
  .skel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .skel-metric { display: flex; flex-direction: column; gap: 2px; }
  .skel-label { width: 48px; height: 10px; border-radius: 2px; background: var(--color-elevated); animation: pulse 1.4s ease-in-out infinite; }
  .skel-value { width: 56px; height: 14px; border-radius: 2px; background: var(--color-elevated); animation: pulse 1.4s ease-in-out infinite; }
  .skel-avg { width: 40px; height: 11px; border-radius: 2px; background: var(--color-elevated); animation: pulse 1.4s ease-in-out infinite; }
  .empty { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--color-dim); padding: 20px 0; text-align: center; margin: 0; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
