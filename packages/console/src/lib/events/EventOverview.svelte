<script lang="ts">
  import { getEventSummary } from './events.remote';
  import { eventDotColor, originBadgeStyle } from './event-helpers';

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  const summaryPromise = $derived.by(() => {
    return getEventSummary({ organization, repoName });
  });

  function formatMetric(name: string, sum: number): string {
    if (name === 'cost_usd') return `$${sum.toFixed(2)}`;
    if (name === 'input_tokens' || name === 'output_tokens') return sum.toLocaleString();
    return String(sum);
  }

  function metricLabel(name: string): string {
    return name.replace(/_/g, ' ');
  }
</script>

{#await summaryPromise}
  <div class="overview">
    <div class="stat-row">
      {#each [1, 2, 3] as i (i)}
        <div class="stat-card">
          <div class="skeleton-label"></div>
          <div class="skeleton-value"></div>
        </div>
      {/each}
    </div>
  </div>
{:then summary}
  {#if summary.total > 0}
    {@const keyMetrics = summary.metrics.filter((m) =>
      ['cost_usd', 'input_tokens', 'output_tokens', 'num_turns'].includes(m.name)
    )}
    {@const maxTypeCount = summary.byType.length > 0 ? summary.byType[0][1] : 1}

    <div class="overview">
      <div class="stat-row">
        <div class="stat-card">
          <span class="stat-label">Events</span>
          <span class="stat-value">{summary.total}</span>
        </div>
        {#each keyMetrics as m (m.name)}
          <div class="stat-card">
            <span class="stat-label">{metricLabel(m.name)}</span>
            <span class="stat-value">{formatMetric(m.name, m.sum)}</span>
          </div>
        {/each}
      </div>

      {#if summary.byType.length > 0}
        <div class="type-breakdown">
          {#each summary.byType as [prefix, count] (prefix)}
            {@const color = eventDotColor(prefix)}
            <div class="type-row">
              <span class="type-dot" style="background:{color};"></span>
              <span class="type-label">{prefix}</span>
              <span class="type-count">{count}</span>
              <div class="type-bar-track">
                <div
                  class="type-bar-fill"
                  style="width:{(count / maxTypeCount) * 100}%;background:color-mix(in srgb, {color} 20%, transparent);"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if summary.byOrigin.length > 0}
        <div class="origin-row">
          {#each summary.byOrigin as [origin, count] (origin)}
            <span class="origin-pill" style={originBadgeStyle(origin)}>{origin} <span class="origin-count">{count}</span></span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
{:catch}
  <div></div>
{/await}

<style>
  .overview { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }

  .stat-row { display: flex; flex-wrap: wrap; gap: 6px; }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  .stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 16px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .type-breakdown { display: flex; flex-direction: column; gap: 1px; }

  .type-row {
    display: grid;
    grid-template-columns: 6px 80px 40px 1fr;
    align-items: center;
    gap: 6px;
    height: 20px;
  }

  .type-dot { width: 5px; height: 5px; border-radius: 50%; }

  .type-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .type-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .type-bar-track { height: 3px; border-radius: 1.5px; overflow: hidden; }

  .type-bar-fill { height: 3px; border-radius: 1.5px; transition: width 0.2s ease; }

  .origin-row { display: flex; flex-wrap: wrap; gap: 4px; }

  .origin-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    line-height: 1.6;
  }

  .origin-count { opacity: 0.7; }

  .skeleton-label {
    width: 48px;
    height: 10px;
    background: var(--color-elevated);
    border-radius: 2px;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skeleton-value {
    width: 56px;
    height: 16px;
    background: var(--color-elevated);
    border-radius: 2px;
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
