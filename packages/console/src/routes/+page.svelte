<script lang="ts">
  import type { PageProps } from './$types';
  import { getDashboardSummary } from '$lib/events/agents/agents.remote';

  let { data }: PageProps = $props();

  const dashboardPromise = $derived.by(() => {
    if (!data.userID) return null;
    return getDashboardSummary({});
  });

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const rem = Math.round(s % 60);
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  }

  function formatCost(v: number): string {
    return `$${v.toFixed(2)}`;
  }

  function formatTokens(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
</script>

{#if data.installation}
  <div class="flex flex-1 items-center justify-center px-6 py-16">
    <div
      class="w-full max-w-sm p-8 text-center"
      style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 4px;"
    >
      <p
        class="mb-2 text-xs font-medium uppercase tracking-widest"
        style="color: var(--color-success);"
      >
        {data.installation.action === 'update' ? 'Installation updated' : 'App installed'}
      </p>
      <h1 class="mb-2 text-base font-semibold" style="color: var(--color-text);">
        GitHub App connected
      </h1>
      <p class="mb-7 text-xs leading-relaxed" style="color: var(--color-muted);">
        The webhook is being processed. Your repository will appear in the console shortly.
      </p>
      <a
        href="/repos"
        class="inline-flex items-center rounded px-4 py-1.5 text-xs font-medium transition-colors"
        style="background: var(--color-accent); color: #fff;"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
      >
        Open Console →
      </a>
    </div>
  </div>
{:else if !data.userID}
  <div class="login">
    <h1 class="login-title">agents</h1>
    <a href="/login" class="login-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
      Sign in with GitHub
    </a>
  </div>
{:else if dashboardPromise}
  {#await dashboardPromise}
    <div class="dashboard">
      <div class="stat-row">
        {#each [1, 2, 3, 4, 5, 6] as i (i)}
          <div class="stat-card">
            <div class="skeleton-label"></div>
            <div class="skeleton-value"></div>
          </div>
        {/each}
      </div>
      <div class="section-heading">Repositories</div>
      <div class="repo-grid">
        {#each [1, 2, 3] as i (i)}
          <div class="repo-card">
            <div class="skeleton-label" style="width:120px;"></div>
            <div class="skeleton-value" style="width:48px;"></div>
          </div>
        {/each}
      </div>
    </div>
  {:then result}
    {#if result && result.global && result.global.total > 0}
      <div class="dashboard">
        <div class="stat-row">
          <div class="stat-card">
            <span class="stat-label">Runs</span>
            <span class="stat-value">{result.global.total}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Avg Duration</span>
            <span class="stat-value">{formatDuration(result.global.avgDurationMs)}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Cost</span>
            <span class="stat-value">{formatCost(result.global.totalCost)}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Tokens</span>
            <span class="stat-value">{formatTokens(result.global.totalTokens)}</span>
          </div>
          {#if result.global.totalLinesAdded > 0 || result.global.totalLinesRemoved > 0}
            <div class="stat-card">
              <span class="stat-label">Lines Changed</span>
              <span class="stat-value lines-changed">+{result.global.totalLinesAdded} / -{result.global.totalLinesRemoved}</span>
            </div>
          {/if}
          <div class="stat-card">
            <span class="stat-label">Pass Rate</span>
            <span class="stat-value">{result.global.passRate}%</span>
            <div class="mini-bar-track">
              <div class="mini-bar-pass" style="width:{result.global.passRate}%;"></div>
              <div class="mini-bar-fail" style="width:{100 - result.global.passRate}%;"></div>
            </div>
          </div>
        </div>

        {#if result.repos.length > 0}
          <div class="section-heading">Repositories</div>
          <div class="repo-grid">
            {#each result.repos as repo (`${repo.owner}/${repo.repo}`)}
              {@const hasChecks = repo.passRate > 0 || repo.total > 0}
              <a href="/gh/{repo.owner}/{repo.repo}" class="repo-card">
                <div class="repo-card-header">
                  <span class="repo-card-name">{repo.owner}/{repo.repo}</span>
                  {#if repo.lastActivity}
                    <span class="repo-card-time">{relativeTime(repo.lastActivity)}</span>
                  {/if}
                </div>
                <div class="repo-card-stats">
                  <span class="repo-card-stat">
                    <span class="repo-card-stat-label">runs</span>
                    <span class="repo-card-stat-value">{repo.total}</span>
                  </span>
                  <span class="repo-card-stat">
                    <span class="repo-card-stat-label">cost</span>
                    <span class="repo-card-stat-value">{formatCost(repo.cost)}</span>
                  </span>
                  {#if hasChecks}
                    <span class="repo-card-stat">
                      <span class="repo-card-stat-label">pass</span>
                      <span class="repo-card-stat-value">{repo.passRate}%</span>
                    </span>
                  {/if}
                </div>
                <div class="mini-bar-track">
                  <div class="mini-bar-pass" style="width:{repo.passRate}%;"></div>
                  <div class="mini-bar-fail" style="width:{100 - repo.passRate}%;"></div>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty">
        <p class="empty-title">No agent runs recorded yet</p>
        <p class="empty-desc">Runs will appear here once agents start processing issues.</p>
      </div>
    {/if}
  {:catch}
    <div class="empty">
      <p class="empty-title">Unable to load dashboard</p>
    </div>
  {/await}
{/if}

<style>
  /* Login */
  .login {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 96px 24px;
  }

  .login-title {
    font-size: 36px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-text);
  }

  .login-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 4px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s;
    color: var(--color-text);
    border: 1px solid var(--color-border-bright);
    background: transparent;
    text-decoration: none;
  }

  .login-btn:hover {
    background: var(--color-hover);
  }

  /* Dashboard */
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

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

  .lines-changed {
    font-size: 12px;
  }

  .mini-bar-track {
    display: flex;
    height: 3px;
    border-radius: 1.5px;
    overflow: hidden;
    margin-top: 4px;
  }

  .mini-bar-pass {
    height: 3px;
    background: var(--color-success);
    transition: width 0.2s ease;
  }

  .mini-bar-fail {
    height: 3px;
    background: var(--color-danger);
    transition: width 0.2s ease;
  }

  /* Section heading */
  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  /* Repo grid */
  .repo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  @media (max-width: 900px) {
    .repo-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 560px) {
    .repo-grid { grid-template-columns: 1fr; }
  }

  .repo-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 12px 14px;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.1s, background 0.1s;
  }

  .repo-card:hover {
    border-color: var(--color-border-bright);
    background: var(--color-elevated);
  }

  .repo-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .repo-card-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .repo-card-time {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex-shrink: 0;
  }

  .repo-card-stats {
    display: flex;
    gap: 12px;
  }

  .repo-card-stat {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .repo-card-stat-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  .repo-card-stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  /* Empty */
  .empty {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
  }

  .empty-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    color: var(--color-muted);
    margin: 0 0 4px;
  }

  .empty-desc {
    font-size: 12px;
    color: var(--color-dim);
    margin: 0;
  }

  /* Skeleton */
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
