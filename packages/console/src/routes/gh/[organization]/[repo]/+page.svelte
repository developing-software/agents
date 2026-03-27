<script lang="ts">
  import type { PageProps } from './$types';
  import { generateToken } from './repo.remote';
  import GitHubLink from '$lib/GitHubLink.svelte';
  import ArtifactViewer from '$lib/ArtifactViewer.svelte';
  import { SvelteSet } from 'svelte/reactivity';

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

  let expandedEvents = new SvelteSet<string>();
  let expandedArtifacts = new SvelteSet<string>();

  function toggleArtifacts(eventId: string) {
    if (expandedEvents.has(eventId)) {
      expandedEvents.delete(eventId);
    } else {
      expandedEvents.add(eventId);
    }
  }

  function toggleArtifactViewer(eventId: string, artifactName: string) {
    const key = `${eventId}/${artifactName}`;
    if (expandedArtifacts.has(key)) {
      expandedArtifacts.delete(key);
    } else {
      expandedArtifacts.add(key);
    }
  }

  function eventDotColor(type: string): string {
    if (type.startsWith('implement.')) return 'var(--color-accent)';
    if (type.startsWith('issues.')) return 'var(--color-success)';
    if (type.startsWith('pull_request.')) return 'var(--color-merged)';
    if (type === 'push') return 'var(--color-dim)';
    return 'var(--color-warning)';
  }

  function sourceBadgeStyle(source: string): string {
    switch (source) {
      case 'action':
        return 'background: var(--color-accent-dim, color-mix(in srgb, var(--color-accent) 15%, transparent)); color: var(--color-accent);';
      case 'webhook':
        return 'background: var(--color-elevated); color: var(--color-muted);';
      case 'cli':
        return 'background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning);';
      case 'console':
        return 'background: color-mix(in srgb, var(--color-merged) 12%, transparent); color: var(--color-merged);';
      default:
        return 'background: var(--color-elevated); color: var(--color-dim);';
    }
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function typePrefix(type: string): string {
    const dot = type.indexOf('.');
    return dot === -1 ? type : type.slice(0, dot);
  }

  const topLevelEvents = $derived(data.events.filter((e) => !e.parentEventId));

  const childEventsByParent = $derived(
    data.events.reduce(
      (acc, e) => {
        if (e.parentEventId) {
          (acc[e.parentEventId] ??= []).push(e);
        }
        return acc;
      },
      {} as Record<string, typeof data.events>,
    ),
  );

  // Unique prefixes in order of first appearance
  const filterPrefixes = $derived.by(() => {
    const seen = new SvelteSet<string>();
    const result: string[] = [];
    for (const e of topLevelEvents) {
      const p = typePrefix(e.type);
      if (!seen.has(p)) {
        seen.add(p);
        result.push(p);
      }
    }
    return result;
  });

  let activeFilter = $state('all');

  const filteredTopLevelEvents = $derived.by(() => {
    if (activeFilter === 'all') return topLevelEvents;
    return topLevelEvents.filter((e) => typePrefix(e.type) === activeFilter);
  });
</script>

<div class="page-grid">
  <!-- ============================================================ -->
  <!-- LEFT: Activity Feed -->
  <!-- ============================================================ -->
  <section class="activity-section">
    <h2 class="section-heading">Activity</h2>

    {#if data.events.length === 0}
      <p class="empty-text">No events</p>
    {:else}
      <!-- Filter tabs -->
      {#if filterPrefixes.length > 1}
        <div class="filter-tabs">
          <button
            type="button"
            class="filter-tab"
            class:filter-tab-active={activeFilter === 'all'}
            onclick={() => { activeFilter = 'all'; }}
          >all</button>
          {#each filterPrefixes as prefix (prefix)}
            <button
              type="button"
              class="filter-tab"
              class:filter-tab-active={activeFilter === prefix}
              onclick={() => { activeFilter = prefix; }}
            >{prefix}</button>
          {/each}
        </div>
      {/if}

      <div class="timeline">
        {#each filteredTopLevelEvents as event (event.id)}
          {@const eventChildren = childEventsByParent[event.id] ?? []}

          <!-- Shared inner content for event rows -->
          {#snippet eventRowInner(ev: typeof event, isChild: boolean)}
            <span
              class="event-dot"
              class:event-dot-child={isChild}
              style="background: {eventDotColor(ev.type)};"
            ></span>
            <span
              class="event-type"
              class:event-type-child={isChild}
            >{ev.type}</span>
            <span
              class="source-badge"
              style={sourceBadgeStyle(ev.source)}
            >{ev.source}</span>
            {#if ev.issueNumber}
              <a
                href="/gh/{data.organization}/{data.repoName}/issues"
                class="ref-link ref-link-issue"
                onclick={(e) => e.stopPropagation()}
              >#{ev.issueNumber}</a>
            {:else if ev.pullRequestNumber}
              <a
                href="/gh/{data.organization}/{data.repoName}/pulls"
                class="ref-link ref-link-pr"
                onclick={(e) => e.stopPropagation()}
              >#{ev.pullRequestNumber}</a>
            {/if}
            <span class="event-time">{relativeTime(ev.timeCreated)}</span>
            {#if ev.artifacts.length > 0}
              <span class="artifact-toggle">{expandedEvents.has(ev.id) ? '▴' : '▾'}</span>
            {/if}
          {/snippet}

          <!-- Event row: button when clickable, div otherwise -->
          {#snippet eventRow(ev: typeof event, isChild: boolean)}
            {#if ev.artifacts.length > 0}
              <button
                type="button"
                class="event-row event-row-clickable"
                class:event-row-child={isChild}
                onclick={() => toggleArtifacts(ev.id)}
              >
                {@render eventRowInner(ev, isChild)}
              </button>
            {:else}
              <div class="event-row" class:event-row-child={isChild}>
                {@render eventRowInner(ev, isChild)}
              </div>
            {/if}

            <!-- Artifacts panel -->
            {#if ev.artifacts.length > 0 && expandedEvents.has(ev.id)}
              <div class="artifacts-panel" class:artifacts-panel-child={isChild}>
                <p class="artifacts-label">Artifacts</p>
                <ul class="artifacts-list">
                  {#each ev.artifacts as artifact (artifact.name)}
                    {@const artifactKey = `${ev.id}/${artifact.name}`}
                    <li class="artifact-item">
                      <div class="artifact-row">
                        <button
                          type="button"
                          class="artifact-pill"
                          class:artifact-pill-active={expandedArtifacts.has(artifactKey)}
                          onclick={() => toggleArtifactViewer(ev.id, artifact.name)}
                        >
                          <span>{artifact.name}</span>
                          <span class="artifact-size">({formatBytes(artifact.size)})</span>
                        </button>
                        <a
                          href="/gh/{data.organization}/{data.repoName}/events/{ev.id}/artifacts/{artifact.name}"
                          class="artifact-download"
                          title="Download {artifact.name}"
                          onclick={(e) => e.stopPropagation()}
                        >↓</a>
                      </div>
                      {#if expandedArtifacts.has(artifactKey)}
                        <ArtifactViewer
                          name={artifact.name}
                          url="/gh/{data.organization}/{data.repoName}/events/{ev.id}/artifacts/{artifact.name}"
                        />
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          {/snippet}

          {@render eventRow(event, false)}

          <!-- Child events indented -->
          {#if eventChildren.length > 0}
            <div class="children-group">
              {#each eventChildren as child (child.id)}
                {@render eventRow(child, true)}
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
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
        <p class="empty-text">No issues synced yet.</p>
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
        <p class="empty-text">No pull requests synced yet.</p>
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

  /* ------------------------------------------------------------------ */
  /* Filter tabs */
  /* ------------------------------------------------------------------ */
  .filter-tabs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 8px;
    margin-bottom: 6px;
  }

  .filter-tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
    line-height: 1.6;
  }

  .filter-tab:hover {
    color: var(--color-muted);
    border-color: var(--color-border-bright, var(--color-dim));
  }

  .filter-tab-active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
  }

  .filter-tab-active:hover {
    color: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
  }

  .timeline {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .event-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    min-width: 0;
    border-radius: 3px;
  }

  .event-row-child {
    padding-left: 16px;
  }

  .event-row-clickable {
    cursor: pointer;
    /* reset button styles */
    background: none;
    border: none;
    text-align: left;
    font: inherit;
    width: 100%;
  }

  .event-row-clickable:hover {
    background: var(--color-hover);
  }

  .event-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .event-dot-child {
    width: 4px;
    height: 4px;
    opacity: 0.7;
  }

  .event-type {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-type-child {
    color: var(--color-muted);
  }

  .source-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
    line-height: 1.6;
  }

  .ref-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-decoration: none;
    flex-shrink: 0;
  }

  .ref-link:hover {
    text-decoration: underline;
  }

  .ref-link-issue {
    color: var(--color-success);
  }

  .ref-link-pr {
    color: var(--color-merged);
  }

  .event-time {
    font-size: 11px;
    color: var(--color-dim);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .artifact-toggle {
    font-size: 11px;
    color: var(--color-dim);
    flex-shrink: 0;
  }

  /* Artifacts panel */
  .artifacts-panel {
    padding: 6px 0 6px 13px;
    background: var(--color-elevated);
    border-radius: 3px;
    margin: 1px 0;
  }

  .artifacts-panel-child {
    padding-left: 29px;
  }

  .artifacts-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
    margin: 0 0 5px;
  }

  .artifacts-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .artifact-item {
    min-width: 0;
  }

  .artifact-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .artifact-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    background: var(--color-surface);
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s;
  }

  .artifact-pill:hover {
    border-color: var(--color-border-bright, var(--color-dim));
  }

  .artifact-pill-active {
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    color: var(--color-text);
  }

  .artifact-size {
    color: var(--color-dim);
  }

  .artifact-download {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-decoration: none;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: color 0.1s, border-color 0.1s;
    flex-shrink: 0;
  }

  .artifact-download:hover {
    color: var(--color-muted);
    border-color: var(--color-border);
  }

  /* Children group */
  .children-group {
    border-left: 1px solid var(--color-border);
    margin-left: 2px;
    padding-left: 0;
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
