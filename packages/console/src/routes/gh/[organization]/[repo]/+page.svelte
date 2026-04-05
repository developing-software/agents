<script lang="ts">
  import type { PageProps } from './$types';
  import { generateToken } from './repo.remote';
  import GitHubLink from '$lib/ui/GitHubLink.svelte';
  import Events from '$lib/events/repository/Feed.svelte';
  import AgentSummary from '$lib/events/agent-completed/AgentSummary.svelte';
  import AgentComparison from '$lib/events/agent-completed/AgentComparison.svelte';

  let { data }: PageProps = $props();

  let token = $state<string | null>(null);
  let tokenError = $state<string | null>(null);

  async function handleGenerateToken() {
    tokenError = null;
    try {
      const result = await generateToken({});
      token = result.token;
    } catch (err) {
      tokenError = err instanceof Error ? err.message : 'Failed to generate token.';
    }
  }
</script>

<div class="page-grid">
  <!-- ============================================================ -->
  <!-- LEFT: Activity Feed -->
  <!-- ============================================================ -->
  <section class="activity-section">
    <div class="metrics-grid">
      <AgentSummary organization={data.organization} repoName={data.repoName} />
      <AgentComparison organization={data.organization} repoName={data.repoName} />
    </div>
    <h2 class="section-heading">Activity</h2>
    <Events organization={data.organization} repoName={data.repoName} />
  </section>

  <!-- ============================================================ -->
  <!-- RIGHT: Issues + PRs + Token -->
  <!-- ============================================================ -->
  <aside class="right-column">

    <!-- Issues -->
    <section class="panel">
      <div class="panel-header">
        <h2 class="section-heading">Issues</h2>
        <a href="/gh/{data.organization}/{data.repoName}/issues" class="view-all-link">View all →</a>
      </div>

      {#if data.issues.length === 0}
        <p class="empty-text">No issues synced yet. They will appear after syncing from GitHub.</p>
      {:else}
        <ul class="item-list">
          {#each data.issues.slice(0, 5) as issue (issue.number)}
            <li class="item-row">
              <span
                class="item-dot"
                style="background: {issue.state === 'open' ? 'var(--color-success)' : 'var(--color-dim)'};"
              ></span>
              <div class="item-body">
                <span class="item-number">#{issue.number}</span>
                <span class="item-title">{issue.title}</span>
                {#if issue.labels && issue.labels.length > 0}
                  <div class="label-group">
                    {#each issue.labels as label (label)}
                      <span class="label-tag">{label}</span>
                    {/each}
                  </div>
                {/if}
              </div>
              <GitHubLink href={issue.htmlUrl} />
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Pull Requests -->
    <section class="panel">
      <div class="panel-header">
        <h2 class="section-heading">Pull Requests</h2>
        <a href="/gh/{data.organization}/{data.repoName}/pulls" class="view-all-link">View all →</a>
      </div>

      {#if data.pulls.length === 0}
        <p class="empty-text">No pull requests synced yet. They will appear after syncing from GitHub.</p>
      {:else}
        <ul class="item-list">
          {#each data.pulls.slice(0, 5) as pr (pr.number)}
            <li class="item-row">
              <span
                class="item-dot"
                style="background: {pr.state === 'open'
                  ? 'var(--color-success)'
                  : pr.state === 'merged'
                    ? 'var(--color-merged)'
                    : 'var(--color-dim)'};"
              ></span>
              <div class="item-body">
                <span class="item-number">#{pr.number}</span>
                <span class="item-title">{pr.title}</span>
                <p class="pr-branches">
                  <span>{pr.headBranch}</span>
                  <span class="branch-arrow">→</span>
                  <span>{pr.baseBranch}</span>
                </p>
              </div>
              <GitHubLink href={pr.htmlUrl} />
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Agent Token -->
    <section class="panel token-panel">
      <h2 class="section-heading" style="margin-bottom: 6px;">Agent Token</h2>
      <p class="token-desc">
        Generate a token and add it as
        <code class="inline-code">AGENTS_TOKEN</code>
        in your repo's Actions secrets.
      </p>
      <button class="generate-btn" onclick={handleGenerateToken}>
        Generate token
      </button>

      {#if token}
        <div class="token-display">
          <p class="token-hint">Copy this token — it won't be shown again.</p>
          <code class="token-value">{token}</code>
        </div>
      {/if}

      {#if tokenError}
        <p class="token-error">{tokenError}</p>
      {/if}
    </section>

  </aside>
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Page grid */
  /* ------------------------------------------------------------------ */
  .page-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 24px;
    align-items: start;
  }

  /* ------------------------------------------------------------------ */
  /* Section headings */
  /* ------------------------------------------------------------------ */
  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  .empty-text {
    font-size: 12px;
    color: var(--color-dim);
    margin: 8px 0 0;
  }

  /* ------------------------------------------------------------------ */
  /* Activity feed */
  /* ------------------------------------------------------------------ */
  .activity-section {
    min-width: 0;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  @media (min-width: 1200px) {
    .metrics-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Right column panels */
  /* ------------------------------------------------------------------ */
  .right-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 12px 14px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .view-all-link {
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
  }

  .view-all-link:hover {
    text-decoration: underline;
  }

  /* Issue / PR list */
  .item-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .item-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 7px 0;
    border-bottom: 1px solid var(--color-border);
    min-width: 0;
  }

  .item-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .item-row:first-child {
    padding-top: 0;
  }

  .item-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 4px;
  }

  .item-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px;
  }

  .item-number {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    flex-shrink: 0;
  }

  .item-title {
    font-size: 12px;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .label-group {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    width: 100%;
    margin-top: 2px;
  }

  .label-tag {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
  }

  .pr-branches {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    margin: 0;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .branch-arrow {
    color: var(--color-dim);
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Agent Token */
  /* ------------------------------------------------------------------ */
  .token-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .token-desc {
    font-size: 12px;
    color: var(--color-muted);
    margin: 6px 0 10px;
    line-height: 1.5;
  }

  .inline-code {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .generate-btn {
    align-self: flex-start;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 500;
    background: var(--color-accent);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.1s;
  }

  .generate-btn:hover {
    background: color-mix(in srgb, var(--color-accent) 85%, white);
  }

  .token-display {
    margin-top: 10px;
    padding: 8px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .token-hint {
    font-size: 11px;
    color: var(--color-dim);
    margin: 0 0 5px;
  }

  .token-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-success);
    word-break: break-all;
  }

  .token-error {
    margin-top: 8px;
    font-size: 12px;
    color: var(--color-danger);
  }
</style>
