<script lang="ts">
  import { getAgentComparison, getAgentStats } from './events.remote';

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  const agentsPromise = $derived.by(() => {
    return getAgentComparison({ organization, repoName });
  });

  const statsPromise = $derived.by(() => {
    return getAgentStats({ organization, repoName });
  });

  const AGENT_COLORS: Record<string, string> = {
    claude: 'var(--color-accent)',
    codex: 'var(--color-success)',
    opencode: '#e879f9',
  };

  const FALLBACK_COLORS = ['var(--color-warning)', '#f97316', '#06b6d4', '#a78bfa', '#fb923c'];

  function agentColor(agent: string): string {
    if (AGENT_COLORS[agent]) return AGENT_COLORS[agent];
    // Stable fallback based on agent name hash
    let hash = 0;
    for (let i = 0; i < agent.length; i++) hash = (hash * 31 + agent.charCodeAt(i)) | 0;
    return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
  }

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatCost(v: number): string {
    return `$${v.toFixed(2)}`;
  }

  function formatTokens(v: number): string {
    return v.toLocaleString();
  }

  function formatPlain(v: number): string {
    return String(Math.round(v * 100) / 100);
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const secs = ms / 1000;
    if (secs < 60) return `${secs.toFixed(1)}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = Math.round(secs % 60);
    return `${mins}m ${remSecs}s`;
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
</script>

{#await agentsPromise}
  <div class="agents-overview">
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
  </div>
{:then agents}
  {#if agents.length > 0}
    <div class="agents-overview">
      <div class="cards">
        {#each agents as agent (agent.agent)}
          {@const color = agentColor(agent.agent)}
          {@const models = Object.entries(agent.models).sort((a, b) => b[1] - a[1])}
          {@const cacheRead = agent.sums.cache_read_input_tokens ?? 0}
          {@const cacheCreation = agent.sums.cache_creation_input_tokens ?? 0}
          {@const cacheTotal = cacheRead + cacheCreation}
          {@const cacheCount = Math.max(agent.counts.cache_read_input_tokens ?? 0, agent.counts.cache_creation_input_tokens ?? 0)}

          <div class="agent-card">
            <div class="card-header">
              <span class="agent-dot" style="background:{color};"></span>
              <span class="agent-name">{capitalize(agent.agent)}</span>
              <span class="run-badge">{agent.count} runs</span>
            </div>

            {#if models.length > 0}
              <div class="models">
                {#each models as [model, count] (model)}
                  <span class="model-pill">{model} <span class="model-count">{count}</span></span>
                {/each}
              </div>
            {/if}

            <div class="metrics-grid">
              {#if agent.sums.cost_usd != null}
                <div class="metric">
                  <span class="metric-label">cost</span>
                  <span class="metric-total">{formatCost(agent.sums.cost_usd)}</span>
                  <span class="metric-avg">avg {formatCost(agent.sums.cost_usd / agent.counts.cost_usd)}</span>
                </div>
              {/if}
              {#if agent.sums.input_tokens != null}
                <div class="metric">
                  <span class="metric-label">input tokens</span>
                  <span class="metric-total">{formatTokens(agent.sums.input_tokens)}</span>
                  <span class="metric-avg">avg {formatTokens(Math.round(agent.sums.input_tokens / agent.counts.input_tokens))}</span>
                </div>
              {/if}
              {#if agent.sums.output_tokens != null}
                <div class="metric">
                  <span class="metric-label">output tokens</span>
                  <span class="metric-total">{formatTokens(agent.sums.output_tokens)}</span>
                  <span class="metric-avg">avg {formatTokens(Math.round(agent.sums.output_tokens / agent.counts.output_tokens))}</span>
                </div>
              {/if}
              {#if cacheTotal > 0}
                <div class="metric">
                  <span class="metric-label">cache tokens</span>
                  <span class="metric-total">{formatTokens(cacheTotal)}</span>
                  <span class="metric-avg">avg {formatTokens(Math.round(cacheTotal / (cacheCount || 1)))}</span>
                </div>
              {/if}
              {#if agent.sums.num_turns != null}
                <div class="metric">
                  <span class="metric-label">turns</span>
                  <span class="metric-total">{formatPlain(agent.sums.num_turns)}</span>
                  <span class="metric-avg">avg {formatPlain(agent.sums.num_turns / agent.counts.num_turns)}</span>
                </div>
              {/if}
            </div>

            <div class="last-seen">Last: {relativeTime(agent.lastSeen)}</div>
          </div>
        {/each}
      </div>

      {#if agents.filter((a) => a.sums.cost_usd != null).length >= 2}
        {@const costAgents = agents.filter((a) => a.sums.cost_usd != null)}
        {@const totalCost = costAgents.reduce((s, a) => s + a.sums.cost_usd, 0)}
        <div class="comparison">
          <div class="cost-bar">
            {#each costAgents as a (a.agent)}
              {@const pct = totalCost > 0 ? (a.sums.cost_usd / totalCost) * 100 : 0}
              <div
                class="cost-segment"
                style="width:{pct}%;background:{agentColor(a.agent)};"
              ></div>
            {/each}
          </div>
          <div class="cost-legend">
            {#each costAgents as a (a.agent)}
              {@const pct = totalCost > 0 ? (a.sums.cost_usd / totalCost) * 100 : 0}
              <span class="legend-item">
                <span class="legend-dot" style="background:{agentColor(a.agent)};"></span>
                {capitalize(a.agent)} {Math.round(pct)}%
              </span>
            {/each}
          </div>
        </div>
      {/if}

      {#await statsPromise then stats}
        {#if stats.length > 0}
          {@const maxDuration = Math.max(...stats.map((s) => s.avgDurationMs))}

          <div class="comparison">
            <div class="section-label">avg duration</div>
            <div class="duration-bars">
              {#each stats as s (s.agent)}
                {@const pct = maxDuration > 0 ? (s.avgDurationMs / maxDuration) * 100 : 0}
                <div class="duration-row">
                  <span class="duration-agent">{capitalize(s.agent)}</span>
                  <div class="duration-track">
                    <div
                      class="duration-fill"
                      style="width:{pct}%;background:{agentColor(s.agent)};"
                    ></div>
                  </div>
                  <span class="duration-value">{formatDuration(s.avgDurationMs)}</span>
                </div>
              {/each}
            </div>
          </div>

          {@const agentsWithChecks = stats.filter((s) => s.checks.length > 0)}
          {#if agentsWithChecks.length > 0}
            <div class="comparison">
              <div class="section-label">check pass rates</div>
              <div class="checks-grid">
                {#each agentsWithChecks as s (s.agent)}
                  <div class="checks-agent">
                    <div class="checks-agent-header">
                      <span class="legend-dot" style="background:{agentColor(s.agent)};"></span>
                      <span class="checks-agent-name">{capitalize(s.agent)}</span>
                    </div>
                    <div class="checks-list">
                      {#each s.checks as check (`${check.category}/${check.name}`)}
                        {@const total = check.passed + check.failed}
                        <div class="check-row">
                          <span class="check-name">{check.name}</span>
                          <span class="check-count" class:all-passed={check.failed === 0}>{check.passed}/{total}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      {/await}
    </div>
  {/if}
{:catch}
  <div></div>
{/await}

<style>
  .agents-overview { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }

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

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .agent-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .agent-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
  }

  .run-badge {
    margin-left: auto;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .models { display: flex; flex-wrap: wrap; gap: 4px; }

  .model-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    line-height: 1.6;
  }

  .model-count { opacity: 0.6; }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .metric-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  .metric-total {
    font-family: "JetBrains Mono", monospace;
    font-size: 14px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .metric-avg {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    font-variant-numeric: tabular-nums;
  }

  .last-seen {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    margin-top: auto;
  }

  /* Comparison bar */
  .comparison { display: flex; flex-direction: column; gap: 4px; }

  .cost-bar {
    display: flex;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
  }

  .cost-segment { height: 100%; transition: width 0.3s ease; }

  .cost-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Section label */
  .section-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  /* Duration bars */
  .duration-bars { display: flex; flex-direction: column; gap: 4px; }

  .duration-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .duration-agent {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    width: 64px;
    flex-shrink: 0;
  }

  .duration-track {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--color-elevated);
    overflow: hidden;
  }

  .duration-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .duration-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
    width: 56px;
    text-align: right;
    flex-shrink: 0;
  }

  /* Check pass rates */
  .checks-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .checks-agent {
    flex: 1;
    min-width: 180px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .checks-agent-header {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .checks-agent-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text);
  }

  .checks-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .check-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .check-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .check-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .check-count.all-passed {
    color: var(--color-success);
  }

  /* Skeleton */
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

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
