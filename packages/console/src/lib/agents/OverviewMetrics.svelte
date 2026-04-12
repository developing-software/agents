<script lang="ts">
  interface Props {
    metrics: {
      planCounts: Record<string, number>;
      agentMetrics: {
        recentEventCount: number;
        agentRunCount: number;
        successRate: number;
      };
    } | null;
  }

  let { metrics }: Props = $props();

  const planStatuses = [
    "draft",
    "review",
    "approved",
    "implementing",
    "completed",
    "rejected",
  ];
</script>

<div class="metrics-container">
  {#if !metrics}
    <!-- Plan Status Loading -->
    <div class="metric-section">
      <h3 class="metric-title">Plan Status</h3>
      <div class="plan-grid">
        {#each planStatuses as status}
          <div class="plan-stat">
            <div class="stat-label">{status}</div>
            <div class="skeleton skeleton-number"></div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Agent Metrics Loading -->
    <div class="metric-section">
      <h3 class="metric-title">Agent Activity</h3>
      <div class="agent-metrics">
        {#each [1, 2, 3] as i (i)}
          <div class="agent-stat">
            <div class="skeleton skeleton-label"></div>
            <div class="skeleton skeleton-number"></div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Plan Status Breakdown -->
    <div class="metric-section">
      <h3 class="metric-title">Plan Status</h3>
      <div class="plan-grid">
        {#each planStatuses as status}
          <div class="plan-stat">
            <div class="stat-label">{status}</div>
            <div class="stat-value">
              {metrics.planCounts[status] ?? 0}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Agent Metrics -->
    <div class="metric-section">
      <h3 class="metric-title">Agent Activity</h3>
      <div class="agent-metrics">
        <div class="agent-stat">
          <span class="agent-stat-label">Recent Events</span>
          <span class="agent-stat-value">
            {metrics.agentMetrics.recentEventCount}
          </span>
        </div>

        <div class="agent-stat">
          <span class="agent-stat-label">Agent Runs</span>
          <span class="agent-stat-value">
            {metrics.agentMetrics.agentRunCount}
          </span>
        </div>

        <div class="agent-stat">
          <span class="agent-stat-label">Success Rate</span>
          <span class="agent-stat-value">
            {metrics.agentMetrics.successRate}%
          </span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .metrics-container {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .metric-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .metric-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0;
  }

  .plan-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
    gap: 8px;
  }

  .plan-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
    gap: 4px;
  }

  .stat-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-dim);
    text-transform: capitalize;
    text-align: center;
  }

  .stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;
  }

  .agent-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .agent-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
    gap: 4px;
  }

  .agent-stat-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .agent-stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;
  }

  /* Skeleton loaders */
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--color-border) 25%,
      var(--color-hover) 50%,
      var(--color-border) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
    border-radius: 3px;
  }

  .skeleton-number {
    width: 100%;
    height: 20px;
  }

  .skeleton-label {
    width: 60%;
    height: 10px;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @media (max-width: 600px) {
    .plan-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .agent-metrics {
      grid-template-columns: 1fr;
    }
  }
</style>
