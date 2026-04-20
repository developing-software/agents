<script lang="ts">
  import type { PageProps } from './$types';
  import { generateToken } from '$lib/features/git/api/repo.remote';
  import { listIssues, listPullRequests } from '$lib/features/git/api/git.remote';
  import ProviderLink from '$lib/features/git/components/ProviderLink.svelte';
  import { providerLabel } from '$lib/features/git/url';
  import Events from '$lib/features/events/components/feed/Feed.svelte';
  import { repoContext } from '$lib/features/git/context.svelte';
  import OverviewLinks from '$lib/features/agents/components/OverviewLinks.svelte';
  import OverviewMetrics from '$lib/features/agents/components/OverviewMetrics.svelte';

  let { data }: PageProps = $props();

  const { organization, repoName } = repoContext.get();
  const issuesQuery = listIssues({ organization, repoName });
  const pullsQuery = listPullRequests({ organization, repoName });

  const issues = $derived(issuesQuery.current?.slice(0, 5) ?? []);
  const pulls = $derived(pullsQuery.current?.slice(0, 5) ?? []);

  const base = $derived(`/${data.provider}/${data.organization}/${data.repoName}`);
  const providerName = $derived(providerLabel(data.provider));

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

<svelte:head>
  <title>{data.organization}/{data.repoName}</title>
</svelte:head>

<div class="page-layout">
  <section class="panel overview-panel">
    <div class="overview-inner">
      <div class="overview-links-col">
        <h2 class="section-heading" style="margin-bottom: 10px;">Quick Links</h2>
        <OverviewLinks {base} />
      </div>
      <div class="overview-metrics-col">
        <h2 class="section-heading" style="margin-bottom: 10px;">Overview</h2>
        <OverviewMetrics {organization} {repoName} />
      </div>
    </div>
  </section>

<div class="page-grid">
  <section class="activity-section">
    <h2 class="section-heading">Activity</h2>
    <Events />
  </section>

  <aside class="right-column">
    <section class="panel">
      <div class="panel-header">
        <h2 class="section-heading">Issues</h2>
        <a href="{base}/issues" class="view-all-link">View all →</a>
      </div>

      {#if issues.length === 0}
        <p class="empty-text">No issues synced yet. They will appear after syncing from {providerName}.</p>
      {:else}
        <ul class="item-list">
          {#each issues as issue (issue.number)}
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
              <ProviderLink href={issue.url} provider={data.provider} />
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2 class="section-heading">Pull Requests</h2>
        <a href="{base}/pulls" class="view-all-link">View all →</a>
      </div>

      {#if pulls.length === 0}
        <p class="empty-text">No pull requests synced yet. They will appear after syncing from {providerName}.</p>
      {:else}
        <ul class="item-list">
          {#each pulls as pr (pr.number)}
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
              <ProviderLink href={pr.url} provider={data.provider} />
            </li>
          {/each}
        </ul>
      {/if}
    </section>

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
</div>

<style>
  .page-layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .overview-panel {
    padding: 14px 16px;
  }

  .overview-inner {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 700px) {
    .overview-inner {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }

  .overview-links-col,
  .overview-metrics-col {
    min-width: 0;
  }

  .page-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 24px;
    align-items: start;
  }

  @media (max-width: 900px) {
    .page-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }

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

  .activity-section {
    min-width: 0;
  }

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
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    background: var(--color-accent);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.1s;
    min-height: 32px;
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
    overflow: hidden;
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
    display: block;
  }

  .token-error {
    margin-top: 8px;
    font-size: 12px;
    color: var(--color-danger);
  }
</style>
